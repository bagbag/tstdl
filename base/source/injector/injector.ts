import { CancellationSignal, CancellationToken } from '#/cancellation/index.js';
import { CircularBuffer } from '#/data-structures/circular-buffer.js';
import { MultiKeyMap } from '#/data-structures/multi-key-map.js';
import type { AsyncDisposeHandler } from '#/disposable/async-disposer.js';
import type { AsyncDisposable } from '#/disposable/disposable.js';
import { isSyncOrAsyncDisposable } from '#/disposable/disposable.js';
import { DeferredPromise } from '#/promise/deferred-promise.js';
import type { ConstructorParameterMetadata } from '#/reflection/registry.js';
import { reflectionRegistry } from '#/reflection/registry.js';
import type { Constructor, OneOrMany, Record, TypedOmit, WritableOneOrMany } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { FactoryMap } from '#/utils/factory-map.js';
import { ForwardRef } from '#/utils/object/forward-ref.js';
import { objectEntries } from '#/utils/object/object.js';
import { assert, isArray, isBoolean, isDefined, isFunction, isNotNull, isNull, isPromise, isUndefined } from '#/utils/type-guards.js';
import type { InjectOptions, InjectionContext } from './inject.js';
import { setCurrentInjectionContext } from './inject.js';
import type { Resolvable, ResolveArgument } from './interfaces.js';
import { afterResolve } from './interfaces.js';
import { isClassProvider, isFactoryProvider, isProviderWithInitializer, isTokenProvider, isValueProvider, type Provider } from './provider.js';
import { ResolveChain } from './resolve-chain.js';
import { ResolveError } from './resolve.error.js';
import { injectMetadataSymbol, injectableMetadataSymbol } from './symbols.js';
import { getTokenName, type InjectionToken } from './token.js';
import type { InjectMetadata } from './type-info.js';
import type { AfterResolveContext, RegistrationOptions, ResolveContext, ResolveContextData, ResolveOptions } from './types.js';

type ResolutionTag = symbol;

type RegistrationsMap = Map<InjectionToken, WritableOneOrMany<Registration>>;
type GlobalRegistrationsMap = Map<InjectionToken, WritableOneOrMany<GlobalRegistration>>;

type InternalResolveContext = {
  resolves: number,

  /** Currently resolving tokens (for circular dependency detection) */
  resolving: Set<InjectionToken>,

  /** resolutions for resolution scoped dependencies  */
  resolutionScopedResolutions: MultiKeyMap<[InjectionToken, unknown], Resolution<any, any>>,

  /** all resolutions in this chain for postprocessing */
  resolutions: Resolution<any, any>[],
  resolutionContextData: FactoryMap<ResolutionTag, ResolveContextData<Record>>,

  forwardRefQueue: CircularBuffer<(() => void | Promise<void>)>,
  forwardRefs: Set<ForwardRef>,

  $done: DeferredPromise
};

type Resolution<T, A> = {
  tag: ResolutionTag,
  registration: Registration<T>,
  value: T,
  argument: ResolveArgument<T, A>,
  afterResolveContext: AfterResolveContext<any>,
  chain: ResolveChain
};

export type GlobalRegistration<T = any, A = any> = {
  token: InjectionToken<T, A>,
  provider: Provider<T, A>,
  options: RegistrationOptions<T, A>
};

export type Registration<T = any, A = any> = GlobalRegistration<T, A> & {
  resolutions: Map<any, T> // <argumentIdentity, T>
};

export type GetRegistrationOptions = {
  skipSelf?: boolean,
  onlySelf?: boolean
};

export type ResolveManyArrayItem<T, A> = [token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions<T, A>];
export type ResolveManyItem<T, A> = InjectionToken<T, A> | ResolveManyArrayItem<T, A>;
export type ResolveManyItemReturnType<T extends ResolveManyItem<any, any>> = T extends ResolveManyItem<infer U, any>
  ? U | (T extends (ResolveManyArrayItem<any, any> & [any, any, { optional: true }]) ? undefined : never)
  : never;
export type ResolveManyReturnType<T extends ResolveManyItem<any, any>[]> = { [I in keyof T]: ResolveManyItemReturnType<T[I]> };

export type AddDisposeHandler = (handler: Disposable | AsyncDisposable | (() => any)) => void;

export class Injector implements AsyncDisposable {
  static readonly #globalRegistrations: GlobalRegistrationsMap = new Map();

  readonly #parent: Injector | null;
  readonly #children: Injector[] = [];
  readonly #disposeToken = new CancellationToken();
  readonly #disposableStack = new AsyncDisposableStack();
  readonly #disposableStackRegistrations = new Set<object>();
  readonly #registrations: RegistrationsMap = new Map();
  readonly #injectorScopedResolutions = new MultiKeyMap<[InjectionToken, unknown], Resolution<any, any>>();
  readonly #addDisposeHandler: AddDisposeHandler;

  readonly name: string;

  get disposed(): boolean {
    return this.#disposableStack.disposed;
  }

  constructor(name: string, parent: Injector | null = null) {
    this.name = name;
    this.#parent = parent;

    this.register(Injector, { useValue: this });
    this.register(CancellationSignal, { useValue: this.#disposeToken.signal });

    this.#addDisposeHandler = (handler: AsyncDisposeHandler): void => {
      if (isSyncOrAsyncDisposable(handler)) {
        this.#disposableStack.use(handler);
      }
      else {
        this.#disposableStack.defer(handler);
      }
    };

    this.#disposableStack.defer(() => this.#registrations.clear());
    this.#disposableStack.defer(() => this.#injectorScopedResolutions.clear());
    this.#disposableStack.defer(() => this.#disposableStackRegistrations.clear());
  }

  /**
   * Globally register a provider for a token
   * @param token token to register
   * @param provider provider used to resolve the token
   * @param options registration options
   */
  static register<T, A = any, C extends Record = Record>(token: InjectionToken<T, A>, providers: OneOrMany<Provider<T, A, C>>, options: RegistrationOptions<T, A, C> = {}): void {
    for (const provider of toArray(providers)) {
      const registration: GlobalRegistration<T> = {
        token,
        provider,
        options: { multi: isArray(providers), ...options }
      };

      addRegistration(Injector.#globalRegistrations, registration);
    }
  }

  /**
   * Globally register a provider for a token as a singleton. Alias for {@link register} with `singleton` lifecycle
   * @param token token to register
   * @param provider provider used to resolve the token
   * @param options registration options
   */
  static registerSingleton<T, A = any, C extends Record = Record>(token: InjectionToken<T, A>, providers: OneOrMany<Provider<T, A, C>>, options?: TypedOmit<RegistrationOptions<T, A, C>, 'lifecycle'>): void {
    Injector.register(token, providers, { ...options, lifecycle: 'singleton' });
  }

  async dispose(): Promise<void> {
    this.#disposeToken.set();
    await this.#disposableStack.disposeAsync();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose();
  }

  fork(name: string): Injector {
    const child = new Injector(name, this);

    this.#children.push(child);
    this.#disposableStack.use(child);

    return child;
  }

  /**
   * Register a provider for a token
   * @param token token to register
   * @param provider provider used to resolve the token
   * @param options registration options
   */
  register<T, A = any, C extends Record = Record>(token: InjectionToken<T, A>, providers: OneOrMany<Provider<T, A, C>>, options: RegistrationOptions<T, A, C> = {}): void {
    this.assertNotDisposed();

    for (const provider of toArray(providers)) {
      const registration: Registration<T> = {
        token,
        provider,
        options: { multi: isArray(providers), ...options },
        resolutions: new Map()
      };

      addRegistration(this.#registrations, registration);
    }
  }

  /**
   * Register a provider for a token as a singleton. Alias for {@link register} with `singleton` lifecycle
   * @param token token to register
   * @param provider provider used to resolve the token
   * @param options registration options
   */
  registerSingleton<T, A = any, C extends Record = Record>(token: InjectionToken<T, A>, providers: OneOrMany<Provider<T, A, C>>, options?: TypedOmit<RegistrationOptions<T, A, C>, 'lifecycle'>): void {
    this.register(token, providers, { ...options, lifecycle: 'singleton' });
  }

  /**
   * Check if token has a registered provider
   * @param token token check
   */
  hasRegistration(token: InjectionToken, options?: GetRegistrationOptions): boolean {
    const registration = this.tryGetRegistration(token, options);
    return isDefined(registration);
  }

  /**
   * Try to get registration
   * @param token token to get registration for
   */
  tryGetRegistration<T, A>(token: InjectionToken<T, A>, options?: GetRegistrationOptions): Registration<T, A> | Registration<T, A>[] | undefined {
    if (isNull(this.#parent) && !this.#registrations.has(token) && Injector.#globalRegistrations.has(token)) {
      const globalRegistrations = toArray(Injector.#globalRegistrations.get(token)!);

      for (const globalRegistration of globalRegistrations) {
        this.register(globalRegistration.token, globalRegistration.provider, globalRegistration.options);
      }
    }

    const ownRegistration = (options?.skipSelf != true) ? this.#registrations.get(token) : undefined;

    if (isDefined(ownRegistration)) {
      return ownRegistration;
    }

    if (options?.onlySelf == true) {
      return undefined;
    }

    return this.#parent?.tryGetRegistration(token);
  }

  /**
   * Get registration
   * @param token token to get registration for
   */
  getRegistration<T, A>(token: InjectionToken<T, A>, options?: GetRegistrationOptions): Registration<T, A> | Registration<T, A>[] {
    const registration = this.tryGetRegistration(token, options);

    if (isUndefined(registration)) {
      const tokenName = getTokenName(token);
      throw new Error(`No provider for ${tokenName} registered.`);
    }

    return registration;
  }

  resolve<T, A>(token: InjectionToken<T, A>, argument: ResolveArgument<T, A>, options: ResolveOptions<T, A> & { optional: true }): T | undefined;
  resolve<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: ResolveOptions<T, A>): T;
  resolve<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options: ResolveOptions<T, A> = {}): T | undefined {
    const context: InternalResolveContext = newInternalResolveContext();
    const value = this._resolve(token, argument, options, context, ResolveChain.startWith(token));

    postProcess(context);

    context.$done.resolve();
    return value;
  }

  resolveAll<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options: ResolveOptions<T, A> = {}): T[] {
    const context: InternalResolveContext = newInternalResolveContext();
    const values = this._resolveAll(token, argument, options, context, ResolveChain.startWith(token));

    postProcess(context);

    context.$done.resolve();
    return values;
  }

  resolveMany<T extends ResolveManyItem<any, any>[]>(...tokens: T): ResolveManyReturnType<T> {
    const context: InternalResolveContext = newInternalResolveContext();

    const values = tokens.map(
      (token) => (
        isArray(token)
          ? this._resolve(token[0], token[1], token[2] ?? {}, context, ResolveChain.startWith(token[0]))
          : this._resolve(token, undefined, {}, context, ResolveChain.startWith(token))
      ) as ResolveManyItemReturnType<any>
    ) as ResolveManyReturnType<T>;

    postProcess(context);

    context.$done.resolve();
    return values;
  }

  async resolveAsync<T, A>(token: InjectionToken<T, A>, argument: ResolveArgument<T, A>, options: ResolveOptions<T, A> & { optional: true }): Promise<T | undefined>;
  async resolveAsync<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: ResolveOptions<T, A>): Promise<T>;
  async resolveAsync<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options: ResolveOptions<T, A> = {}): Promise<T | undefined> {
    const context: InternalResolveContext = newInternalResolveContext();
    const value = this._resolve(token, argument, options, context, ResolveChain.startWith(token));

    await postProcessAsync(context);

    context.$done.resolve();
    return value;
  }

  async resolveAllAsync<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options: ResolveOptions<T, A> = {}): Promise<T[]> {
    const context: InternalResolveContext = newInternalResolveContext();
    const values = this._resolveAll(token, argument, options, context, ResolveChain.startWith(token));

    await postProcessAsync(context);

    context.$done.resolve();
    return values;
  }

  async resolveManyAsync<T extends ResolveManyItem<any, any>[]>(...tokens: T): Promise<ResolveManyReturnType<T>> {
    const context: InternalResolveContext = newInternalResolveContext();

    const values = tokens.map(
      (token) => (
        isArray(token)
          ? this._resolve(token[0], token[1], token[2] ?? {}, context, ResolveChain.startWith(token[0]))
          : this._resolve(token, undefined, {}, context, ResolveChain.startWith(token))
      ) as ResolveManyItemReturnType<any>
    ) as ResolveManyReturnType<T>;

    await postProcessAsync(context);

    context.$done.resolve();
    return values;
  }

  private _resolve<T, A>(token: InjectionToken<T, A>, argument: ResolveArgument<T, A>, options: ResolveOptions<T, A>, context: InternalResolveContext, chain: ResolveChain): T | undefined {
    this.assertNotDisposed();

    if (isDefined(options.forwardRef) && (options.forwardRef != false)) {
      assert(options.optional != true, 'ForwardRef does not support optional without resolveAll/injectAll as undefined is not forwardable.');

      const forwardRef = ForwardRef.create<object>();
      const forwardToken = isFunction(options.forwardRef) ? options.forwardRef() : token;

      context.forwardRefQueue.add(() => ForwardRef.setRef(forwardRef, this._resolve(forwardToken, argument, { ...options, forwardRef: false }, context, chain.markAsForwardRef(forwardToken)) as object));
      context.forwardRefs.add(forwardRef);

      return forwardRef as T;
    }

    if (isUndefined(token)) {
      throw new ResolveError('Token is undefined - this might be because of circular dependencies, use alias or forwardRef in this case.', chain);
    }

    const registration = (options.skipSelf == true) ? undefined : this.tryGetRegistration(token);

    if (isUndefined(registration)) {
      if (isNotNull(this.#parent) && (options.onlySelf != true)) {
        return this.#parent._resolve(token, argument, { ...options, skipSelf: false }, context, chain);
      }

      if (options.optional == true) {
        return undefined;
      }

      throw new ResolveError(`No provider for ${getTokenName(token)} registered.`, chain);
    }

    const singleRegistration = isArray(registration) ? registration[0]! : registration;
    return this._resolveRegistration(singleRegistration, argument, options, context, chain);
  }

  private _resolveAll<T, A>(token: InjectionToken<T, A>, argument: ResolveArgument<T, A>, options: ResolveOptions<T, A>, context: InternalResolveContext, chain: ResolveChain): T[] {
    this.assertNotDisposed();

    if (isDefined(options.forwardRef) && (options.forwardRef != false)) {
      const forwardRef = ForwardRef.create<T[]>({ typeHint: options.forwardRefTypeHint });
      const forwardToken = isFunction(options.forwardRef) ? options.forwardRef() : token;

      context.forwardRefQueue.add(() => ForwardRef.setRef(forwardRef, this._resolveAll(forwardToken, argument, { ...options, forwardRef: false }, context, chain.markAsForwardRef(forwardToken))));
      context.forwardRefs.add(forwardRef);

      return forwardRef as T[];
    }

    if (isUndefined(token)) {
      throw new ResolveError('Token is undefined - this might be because of circular dependencies, use alias or forwardRef in this case.', chain);
    }

    const registration = (options.skipSelf == true) ? undefined : this.tryGetRegistration(token);

    if (isUndefined(registration)) {
      if (isNotNull(this.#parent) && (options.onlySelf != true)) {
        return this.#parent._resolveAll(token, argument, { ...options, skipSelf: false }, context, chain);
      }

      if (options.optional == true) {
        return [];
      }

      throw new ResolveError(`No provider for ${getTokenName(token)} registered.`, chain);
    }

    const registrations = isArray(registration) ? registration : [registration];
    return registrations.map((reg) => this._resolveRegistration(reg, argument, options, context, chain));
  }

  private _resolveRegistration<T, A>(registration: Registration<T, A>, argument: ResolveArgument<T, A>, options: ResolveOptions<T, A>, context: InternalResolveContext, chain: ResolveChain): T {
    checkOverflow(chain, context);

    const injectionContext = this.getInjectionContext(context, argument, chain);
    const previousInjectionContext = setCurrentInjectionContext(injectionContext);

    const resolutionTag = Symbol(); // eslint-disable-line symbol-description

    try {
      const { token } = registration;
      const resolutionScoped = registration.options.lifecycle == 'resolution';
      const injectorScoped = registration.options.lifecycle == 'injector';
      const singletonScoped = registration.options.lifecycle == 'singleton';
      const resolveArgument = argument ?? registration.options.defaultArgument ?? (registration.options.defaultArgumentProvider?.(this.getResolveContext(resolutionTag, context, chain)));
      const argumentIdentity = resolveArgumentIdentity(registration, resolveArgument);

      if (resolutionScoped && context.resolutionScopedResolutions.hasFlat(token, argumentIdentity)) {
        return context.resolutionScopedResolutions.getFlat(token, argumentIdentity)!.value as T;
      }
      else if (injectorScoped && this.#injectorScopedResolutions.hasFlat(token, argumentIdentity)) {
        return this.#injectorScopedResolutions.getFlat(token, argumentIdentity)!.value as T;
      }
      else if (singletonScoped && registration.resolutions.has(argumentIdentity)) {
        return registration.resolutions.get(argumentIdentity)!;
      }

      const value = this._resolveProvider(resolutionTag, registration, resolveArgument, options, context, injectionContext, chain);

      const resolution: Resolution<T, A> = {
        tag: resolutionTag,
        registration,
        value,
        argument: injectionContext.argument as ResolveArgument<T, A>,
        afterResolveContext: this.getAfterResolveContext(resolutionTag, context),
        chain
      };

      context.resolutions.push(resolution);

      if (resolutionScoped) {
        context.resolutionScopedResolutions.setFlat(token, argumentIdentity, resolution);
      }

      if (injectorScoped) {
        this.#injectorScopedResolutions.setFlat(token, argumentIdentity, resolution);
      }

      if (singletonScoped) {
        registration.resolutions.set(argumentIdentity, value);
      }

      return value;
    }
    finally {
      setCurrentInjectionContext(previousInjectionContext);
    }
  }

  private _resolveProvider<T, A>(resolutionTag: ResolutionTag, registration: Registration<T, A>, resolveArgument: ResolveArgument<T, A>, options: ResolveOptions<T, A>, context: InternalResolveContext, injectionContext: InjectionContext, chain: ResolveChain): T {
    try {
      setResolving(registration.token, context, chain);

      const { provider } = registration;

      let result: { value: T } | undefined;

      if (isClassProvider(provider)) {
        const typeMetadata = reflectionRegistry.getMetadata(provider.useClass);
        const arg = resolveArgument ?? provider.defaultArgument ?? provider.defaultArgumentProvider?.();
        injectionContext.argument = arg;

        if ((provider.useClass.length > 0) && (isUndefined(typeMetadata) || !typeMetadata.data.has(injectableMetadataSymbol))) {
          throw new ResolveError(`${provider.useClass.name} has constructor parameters but is not injectable.`, chain);
        }

        const parameters = (typeMetadata?.parameters ?? []).map((metadata): unknown => this.resolveClassInjection(resolutionTag, context, provider.useClass, metadata, arg, chain));

        try {
          result = { value: new provider.useClass(...parameters) };
        }
        catch (error) {
          if (error instanceof ResolveError) {
            throw error;
          }

          throw new ResolveError('Error in class constructor.', chain, error as Error);
        }
      }

      if (isValueProvider(provider)) {
        result = { value: provider.useValue };
      }

      if (isTokenProvider(provider)) {
        const innerToken = (provider.useToken ?? provider.useTokenProvider()) as InjectionToken<T>;
        const arg = resolveArgument ?? provider.defaultArgument ?? provider.defaultArgumentProvider?.();
        injectionContext.argument = arg;

        if (provider.resolveAll == true) {
          return this._resolveAll<T, A>(innerToken, arg, options, context, chain.addToken(innerToken)) as T;
        }

        result = { value: this._resolve<T, A>(innerToken, arg, options, context, chain.addToken(innerToken))! };
      }

      if (isFactoryProvider<T, A>(provider)) {
        const arg = resolveArgument ?? provider.defaultArgument ?? provider.defaultArgumentProvider?.();
        injectionContext.argument = arg;

        try {
          result = { value: provider.useFactory(arg, this.getResolveContext(resolutionTag, context, chain)) };
        }
        catch (error) {
          throw new ResolveError('Error in provider factory.', chain, error as Error);
        }
      }

      if (isUndefined(result)) {
        throw new Error('Unsupported provider.');
      }

      if (isSyncOrAsyncDisposable(result.value) && !this.#disposableStackRegistrations.has(result.value)) {
        this.#disposableStack.use(result.value);
        this.#disposableStackRegistrations.add(result.value);
      }

      return result.value;
    }
    finally {
      deleteResolving(registration.token, context);
    }
  }

  private resolveClassInjection(resolutionTag: ResolutionTag, context: InternalResolveContext, constructor: Constructor, metadata: ConstructorParameterMetadata, resolveArgument: any, chain: ResolveChain): unknown {
    const getChain = (injectToken: InjectionToken): ResolveChain => chain.addParameter(constructor, metadata.index, injectToken);

    const injectMetadata: InjectMetadata = metadata.data.tryGet(injectMetadataSymbol) ?? {};
    const injectToken = (injectMetadata.injectToken ?? metadata.type)!;

    if (isDefined(injectMetadata.injectArgumentMapper) && (!this.hasRegistration(injectToken) || isDefined(resolveArgument) || isUndefined(injectToken))) {
      return injectMetadata.injectArgumentMapper(resolveArgument);
    }

    const parameterResolveArgument = injectMetadata.forwardArgumentMapper?.(resolveArgument) ?? injectMetadata.resolveArgumentProvider?.(this.getResolveContext(resolutionTag, context, getChain(injectToken)));
    const { forwardRef } = injectMetadata;

    if (isDefined(forwardRef)) {
      context.forwardRefQueue.add(() => {
        const forwardToken = isFunction(forwardRef) ? forwardRef() : isBoolean(forwardRef) ? injectToken : forwardRef;

        if (isDefined(injectMetadata.mapper)) {
          throw new ResolveError('Cannot use inject mapper with forwardRef.', getChain(forwardToken));
        }
      });
    }

    const resolveFn = (injectMetadata.resolveAll == true) ? '_resolveAll' : '_resolve';
    const resolved = this[resolveFn](injectToken, parameterResolveArgument, { optional: injectMetadata.optional, forwardRef, forwardRefTypeHint: injectMetadata.forwardRefTypeHint }, context, getChain(injectToken));
    return isDefined(injectMetadata.mapper) ? injectMetadata.mapper(resolved) : resolved;
  }

  private resolveInjection<T, A>(token: InjectionToken<T>, argument: ResolveArgument<T, A>, options: InjectOptions<T, A>, context: InternalResolveContext, injectIndex: number, chain: ResolveChain): T {
    return this._resolve(token, argument, options, context, chain.addInject(token, injectIndex))!;
  }

  private async resolveInjectionAsync<T, A>(token: InjectionToken<T>, argument: ResolveArgument<T, A>, options: InjectOptions<T, A>, context: InternalResolveContext, injectIndex: number, chain: ResolveChain): Promise<T> {
    const value = this.resolveInjection(token, argument, options, context, injectIndex, chain);

    await context.$done;
    return value;
  }

  private resolveInjectionAll<T, A>(token: InjectionToken<T>, argument: ResolveArgument<T, A>, options: InjectOptions<T, A>, context: InternalResolveContext, injectIndex: number, chain: ResolveChain): T[] {
    return this._resolveAll(token, argument, options, context, chain.addInject(token, injectIndex));
  }

  private async resolveInjectionAllAsync<T, A>(token: InjectionToken<T>, argument: ResolveArgument<T, A>, options: InjectOptions<T, A>, context: InternalResolveContext, injectIndex: number, chain: ResolveChain): Promise<T[]> {
    const values = this.resolveInjectionAll(token, argument, options, context, injectIndex, chain);

    await context.$done;
    return values;
  }

  private getResolveContext(resolutionTag: ResolutionTag, resolveContext: InternalResolveContext, chain: ResolveChain): ResolveContext<any> {
    const context: ResolveContext<any> = {
      resolve: (token, argument, options) => this._resolve(token, argument, options ?? {}, resolveContext, chain.addToken(token)),
      resolveAll: (token, argument, options) => this._resolveAll(token, argument, options ?? {}, resolveContext, chain.addToken(token)),
      cancellationSignal: this.#disposeToken,
      addDisposeHandler: this.#addDisposeHandler,
      get data() {
        return resolveContext.resolutionContextData.get(resolutionTag);
      }
    };

    return context;
  }

  private getAfterResolveContext(resolutionTag: ResolutionTag, resolveContext: InternalResolveContext): AfterResolveContext<any> {
    const context: AfterResolveContext<any> = {
      cancellationSignal: this.#disposeToken,
      addDisposeHandler: this.#addDisposeHandler,
      get data() {
        return resolveContext.resolutionContextData.get(resolutionTag);
      }
    };

    return context;
  }

  private getInjectionContext(resolveContext: InternalResolveContext, resolveArgument: any, chain: ResolveChain): InjectionContext {
    let injectIndex = 0;

    const context: InjectionContext = {
      injector: this,
      argument: resolveArgument,
      inject: (token, argument, options) => this.resolveInjection(token, argument, options ?? {}, resolveContext, injectIndex++, chain),
      injectAll: (token, argument, options) => this.resolveInjectionAll(token, argument, options ?? {}, resolveContext, injectIndex++, chain),
      injectMany: (...tokens) => this.resolveMany(...tokens),
      injectAsync: async (token, argument, options) => this.resolveInjectionAsync(token, argument, options ?? {}, resolveContext, injectIndex++, chain),
      injectAllAsync: async (token, argument, options) => this.resolveInjectionAllAsync(token, argument, options ?? {}, resolveContext, injectIndex++, chain),
      injectManyAsync: async (...tokens) => this.resolveManyAsync(...tokens)
    };

    return context;
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error('Injector is disposed.');
    }
  }
}

function addRegistration<T extends GlobalRegistration>(registrations: Map<InjectionToken, WritableOneOrMany<T>>, registration: T): void {
  if (isClassProvider(registration.provider)) {
    const injectable = reflectionRegistry.getMetadata(registration.provider.useClass)?.data.has(injectableMetadataSymbol) ?? false;

    if (!injectable) {
      throw new Error(`${registration.provider.useClass.name} is not injectable.`);
    }
  }

  const multi = registration.options.multi ?? false;
  const existingRegistration = registrations.get(registration.token);
  const hasExistingRegistration = isDefined(existingRegistration);
  const existingIsMulti = hasExistingRegistration && isArray(existingRegistration);

  if (hasExistingRegistration && (existingIsMulti != multi)) {
    throw new Error('Cannot mix multi and non-multi registrations.');
  }

  if (multi && existingIsMulti) {
    existingRegistration.push(registration);
  }
  else {
    registrations.set(registration.token, multi ? [registration] : registration);
  }
}

function newInternalResolveContext(): InternalResolveContext {
  return {
    resolves: 0,
    resolving: new Set(),
    resolutionScopedResolutions: new MultiKeyMap(),
    resolutions: [],
    resolutionContextData: new FactoryMap(() => ({})),
    forwardRefQueue: new CircularBuffer(),
    forwardRefs: new Set(),
    $done: new DeferredPromise()
  };
}

function postProcess(context: InternalResolveContext): void {
  for (const fn of context.forwardRefQueue.consume()) {
    (fn as () => void)();
  }

  derefForwardRefs(context);

  for (const resolution of context.resolutions) {
    if (isFunction((resolution.value as Resolvable | undefined)?.[afterResolve])) {
      const returnValue = (resolution.value as Resolvable)[afterResolve]!(resolution.argument, resolution.afterResolveContext);
      throwOnPromise(returnValue, '[afterResolve]', resolution.chain);
    }

    if (isProviderWithInitializer(resolution.registration.provider)) {
      const returnValue = resolution.registration.provider.afterResolve?.(resolution.value, resolution.argument, resolution.afterResolveContext);
      throwOnPromise(returnValue, 'provider afterResolve handler', resolution.chain);
    }

    if (isDefined(resolution.registration.options.afterResolve)) {
      const returnValue = resolution.registration.options.afterResolve(resolution.value, resolution.argument, resolution.afterResolveContext);
      throwOnPromise(returnValue, 'registration afterResolve handler', resolution.chain);
    }
  }
}

async function postProcessAsync(context: InternalResolveContext): Promise<void> {
  for (const fn of context.forwardRefQueue.consume()) {
    (fn as () => void)();
  }

  derefForwardRefs(context);

  for (const resolution of context.resolutions) {
    if (isFunction((resolution.value as Resolvable | undefined)?.[afterResolve])) {
      await (resolution.value as Resolvable)[afterResolve]!(resolution.argument, resolution.afterResolveContext);
    }

    if (isProviderWithInitializer(resolution.registration.provider)) {
      await resolution.registration.provider.afterResolve?.(resolution.value, resolution.argument, resolution.afterResolveContext);
    }

    if (isDefined(resolution.registration.options.afterResolve)) {
      await resolution.registration.options.afterResolve(resolution.value, resolution.argument, resolution.afterResolveContext);
    }
  }
}

function resolveArgumentIdentity(registration: Registration, resolveArgument: any): any {
  if (isDefined(registration.options.argumentIdentityProvider) && ((registration.options.lifecycle == 'resolution') || (registration.options.lifecycle == 'singleton'))) {
    return registration.options.argumentIdentityProvider(resolveArgument);
  }

  return resolveArgument;
}

function setResolving(token: InjectionToken, context: InternalResolveContext, chain: ResolveChain): void {
  if (context.resolving.has(token)) {
    throw new ResolveError('Circular dependency to itself detected. Please check your registrations and providers. ForwardRef might be a solution.', chain);
  }

  context.resolving.add(token);
}

function deleteResolving(token: InjectionToken, context: InternalResolveContext): void {
  context.resolving.delete(token);
}

function throwOnPromise<T>(value: T | Promise<T>, type: string, chain: ResolveChain): asserts value is T {
  if (isPromise(value)) {
    throw new ResolveError(`Cannot evaluate async ${type} in synchronous resolve, use resolveAsync() instead.`, chain);
  }
}

function checkOverflow(chain: ResolveChain, context: InternalResolveContext): void {
  if ((chain.length > 100) || (++context.resolves > 7500)) {
    throw new ResolveError('Resolve stack overflow. This can happen on circular dependencies with transient lifecycles and self reference. Use scoped or singleton lifecycle or forwardRef instead.', chain);
  }
}

function derefForwardRefs(context: InternalResolveContext): void {
  for (const resolution of context.resolutions.values()) {
    if (!(typeof resolution.value == 'object')) {
      continue;
    }

    for (const [key, value] of objectEntries(resolution.value as Record)) {
      if (!context.forwardRefs.has(value as ForwardRef)) {
        continue;
      }

      (resolution.value as Record)[key] = ForwardRef.deref(value);
    }
  }
}
