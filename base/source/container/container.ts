import { CircularBuffer } from '#/data-structures/circular-buffer.js';
import { MultiKeyMap } from '#/data-structures/multi-key-map.js';
import type { ConstructorParameterMetadata, PropertyMetadata, TypeMetadata } from '#/reflection/index.js';
import { reflectionRegistry } from '#/reflection/index.js';
import type { Constructor, Record, TypedOmit } from '#/types.js';
import { mapAsync } from '#/utils/async-iterable-helpers/map.js';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array.js';
import { ForwardRef } from '#/utils/object/forward-ref.js';
import { objectEntries } from '#/utils/object/object.js';
import { isDefined, isFunction, isPromise, isUndefined } from '#/utils/type-guards.js';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import type { AfterResolve, Injectable, InjectableArgument } from './interfaces.js';
import { afterResolve } from './interfaces.js';
import type { Provider } from './provider.js';
import { isClassProvider, isFactoryProvider, isTokenProvider, isValueProvider } from './provider.js';
import { ResolveChain } from './resolve-chain.js';
import { ResolveError } from './resolve.error.js';
import type { InjectionToken } from './token.js';
import { getTokenName } from './token.js';
import type { InjectMetadata } from './type-info.js';
import type { ArgumentProvider, Mapper, ResolveContext } from './types.js';
import { isStubClass } from './utils.js';

export const injectMetadataSymbol = Symbol('Inject metadata');

type InternalResolveContext = {
  isAsync: boolean,
  resolves: number,
  forwardRefQueue: CircularBuffer<() => void | Promise<void>>,
  resolutions: { instance: any, registration: Registration }[],
  forwardRefs: Set<ForwardRef>,
  providedInstances: Map<InjectionToken, any>,
  instances: MultiKeyMap<[InjectionToken, any], any>,
  resolving: MultiKeyMap<[InjectionToken, any], true>
};

/**
 * transient: a new instance will be created with each resolve
 * singleton: each resolve will return the same instance
 * resolution: the same instance will be resolved for each resolution of this dependency during a single resolution chain
 */
export type Lifecycle = 'transient' | 'singleton' | 'resolution';

export type RegistrationOptions<T, A = unknown> = {
  lifecycle?: Lifecycle,

  /** default resolve argument used when neither token nor explicit resolve argument is provided */
  defaultArgument?: InjectableArgument<T, A>,

  /** default resolve argument used when neither token nor explicit resolve argument is provided */
  defaultArgumentProvider?: ArgumentProvider<InjectableArgument<T, A>>,

  /**
   * value to distinguish scoped and singleton instances based on argument
   * by default it uses strict equality (===) on the original argument,
   * so modifications to argument objects and literal objects in the call
   * may not yield the expected result
   *
   * hint: {@link JSON.stringify} is a simple solution for many use cases,
   * but will fail if properties have different order
   */
  argumentIdentityProvider?: Mapper<InjectableArgument<T, A> | undefined>,

  /** function which gets called after a resolve */
  initializer?: (instance: T) => any,

  /** custom metadata */
  metadata?: Record
};

export type Registration<T = any, A = any> = {
  token: InjectionToken<T, A>,
  provider: Provider<T, A>,
  options: RegistrationOptions<T, A>,
  instances: Map<any, T>
};

export class Container {
  private readonly registrationMap: Map<InjectionToken, Registration>;
  private readonly registrationSubject: Subject<Registration>;

  /** emits on new registration */
  readonly registration$: Observable<Registration>;

  /** all registrations */
  get registrations(): Iterable<Registration> {
    return this.registrationMap.values();
  }

  constructor() {
    this.registrationMap = new Map();
    this.registrationSubject = new Subject();

    this.registration$ = this.registrationSubject.asObservable();
  }

  /**
   * register a provider for a token
   * @param token token to register
   * @param provider provider used to resolve the token
   * @param options registration options
   */
  register<T, A = any>(token: InjectionToken<T, A>, provider: Provider<T, A>, options: RegistrationOptions<T, A> = {}): void {
    if (isClassProvider(provider) && !isStubClass(provider.useClass)) {
      const injectable = reflectionRegistry.getMetadata(provider.useClass)?.data.has(injectMetadataSymbol) ?? false;

      if (!injectable) {
        throw new Error(`${provider.useClass.name} is not injectable.`);
      }
    }

    const registration: Registration = {
      token,
      provider,
      options,
      instances: new Map()
    };

    this.registrationMap.set(token, registration);
    this.registrationSubject.next(registration);
  }

  /**
   * register a provider for a token as a singleton. Alias for {@link register} with `singleton` lifecycle
   * @param token token to register
   * @param provider provider used to resolve the token
   * @param options registration options
   */
  registerSingleton<T, A = any>(token: InjectionToken<T, A>, provider: Provider<T, A>, options?: TypedOmit<RegistrationOptions<T, A>, 'lifecycle'>): void {
    this.register(token, provider, { ...options, lifecycle: 'singleton' });
  }

  /**
   * check if token has a registered provider
   * @param token token check
   */
  hasRegistration(token: InjectionToken): boolean {
    return this.registrationMap.has(token);
  }

  /**
   * get registration
   * @param token token to get registration for
   */
  getRegistration<T, A>(token: InjectionToken<T, A>): Registration<T, A> {
    const registration = this.registrationMap.get(token);

    if (isUndefined(registration)) {
      const tokenName = getTokenName(token);
      throw new Error(`No provider for ${tokenName} registered.`);
    }

    return registration;
  }

  /**
   * try to get registration
   * @param token token to get registration for
   */
  tryGetRegistration<T, A>(token: InjectionToken<T, A>): Registration<T, A> | undefined {
    return this.registrationMap.get(token);
  }

  /**
   * resolve a token
   * @param token token to resolve
   * @param argument argument used for resolving (overrides token and default arguments)
   * @returns
   */
  resolve<T, A = T extends Injectable<infer AInject> ? AInject : any>(token: InjectionToken<T, A>, argument?: T extends Injectable<infer AInject> ? AInject : A, instances?: [InjectionToken, any][]): T {
    const context: InternalResolveContext = {
      isAsync: false,
      resolves: 0,
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      forwardRefs: new Set(),
      providedInstances: new Map(instances),
      instances: new MultiKeyMap(),
      resolving: new MultiKeyMap()
    };

    return this._resolve(token, false, argument, context, ResolveChain.startWith(token), true);
  }

  /**
   * resolve a token
   * @param token token to resolve
   * @param argument argument used for resolving (overrides token and default arguments)
   * @returns
   */
  async resolveAsync<T, A = T extends Injectable<infer AInject> ? AInject : any>(token: InjectionToken<T, A>, argument?: T extends Injectable<infer AInject> ? AInject : A, instances?: [InjectionToken, any][]): Promise<T> {
    const context: InternalResolveContext = {
      isAsync: true,
      resolves: 0,
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      forwardRefs: new Set(),
      providedInstances: new Map(instances),
      instances: new MultiKeyMap(),
      resolving: new MultiKeyMap()
    };

    return this._resolveAsync(token, false, argument, context, ResolveChain.startWith(token), true);
  }

  // eslint-disable-next-line max-statements, max-lines-per-function, complexity
  private _resolve<T, A>(token: InjectionToken<T, A>, optional: boolean | undefined, _argument: InjectableArgument<T, A> | undefined, context: InternalResolveContext, chain: ResolveChain, isFirst: boolean): T {
    if ((chain.length > 750) || (++context.resolves > 750)) {
      throw new ResolveError('Resolve stack overflow. This can happen on circular dependencies with transient lifecycles and self reference. Use scoped or singleton lifecycle instead or @forwardRef().', chain);
    }

    if (isUndefined(token)) {
      throw new ResolveError('Token is undefined - this might be because of circular dependencies, use alias or forwardRef in this case.', chain);
    }

    if (context.providedInstances.has(token)) {
      return context.providedInstances.get(token) as T;
    }

    const registration = this.tryGetRegistration(token);

    if (isUndefined(registration)) {
      if (optional == true) {
        return undefined as unknown as T;
      }

      throw new ResolveError(`No provider for ${getTokenName(token)} registered.`, chain);
    }

    const resolveArgument = _argument ?? registration.options.defaultArgument ?? registration.options.defaultArgumentProvider?.(this.getResolveContext(context, chain));

    if (isPromise(resolveArgument)) {
      throw new ResolveError(`Cannot evaluate async argument provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead.`, chain);
    }

    const argumentIdentity = (isDefined(registration.options.argumentIdentityProvider) && ((registration.options.lifecycle == 'resolution') || (registration.options.lifecycle == 'singleton')))
      ? registration.options.argumentIdentityProvider(resolveArgument)
      : resolveArgument;

    if (isPromise(argumentIdentity)) {
      throw new ResolveError(`Cannot evaluate async argument identity provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead.`, chain);
    }

    if ((registration.options.lifecycle == 'resolution') && context.instances.has([token, argumentIdentity])) {
      return context.instances.get([token, argumentIdentity]) as T;
    }

    if ((registration.options.lifecycle == 'singleton') && registration.instances.has(argumentIdentity)) {
      return registration.instances.get(argumentIdentity)!;
    }

    if (context.resolving.has([token, argumentIdentity])) {
      throw new ResolveError('Circular dependency to itself detected. Please check your registrations and providers. @forwardRef might be a solution.', chain);
    }

    context.resolving.set([token, argumentIdentity], true);

    let instance!: T;

    if (isClassProvider(registration.provider)) {
      const typeMetadata = reflectionRegistry.getMetadata(registration.provider.useClass);

      if (isUndefined(typeMetadata) || !typeMetadata.data.has(injectMetadataSymbol)) {
        throw new ResolveError(`${registration.provider.useClass.name} is not injectable.`, chain);
      }

      if (isStubClass(typeMetadata.constructor)) {
        throw new ResolveError(`No provider for ${getTokenName(token)} registered.`, chain);
      }

      const parameters = (typeMetadata.parameters ?? []).map((metadata): unknown => this.resolveInjection(token, context, typeMetadata, metadata, resolveArgument, chain));

      instance = new (typeMetadata.constructor as Constructor)(...parameters) as T;

      for (const [property, metadata] of typeMetadata.properties) {
        if (!metadata.data.has(injectMetadataSymbol)) {
          continue;
        }

        (instance as Record)[property as string] = this.resolveInjection(token, context, typeMetadata, metadata, resolveArgument, chain);
      }
    }

    if (isValueProvider(registration.provider)) {
      instance = registration.provider.useValue;
    }

    if (isTokenProvider(registration.provider)) {
      const arg = resolveArgument ?? registration.provider.argument ?? registration.provider.argumentProvider?.();
      const innerToken = registration.provider.useToken ?? registration.provider.useTokenProvider();

      if (isPromise(arg)) {
        throw new ResolveError(`Cannot evaluate async argument provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead.`, chain);
      }

      if (isPromise(innerToken)) {
        throw new ResolveError(`Cannot evaluate async token provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead.`, chain);
      }

      instance = this._resolve<T, A>(innerToken, false, arg, context, chain.addToken(innerToken), false);
    }

    if (isFactoryProvider(registration.provider)) {
      try {
        const result = registration.provider.useFactory(resolveArgument, this.getResolveContext(context, chain));

        if (isPromise(result)) {
          throw new ResolveError(`Cannot evaluate async factory provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead.`, chain);
        }

        instance = result;
      }
      catch (error) {
        throw new ResolveError('Error in factory.', chain, error as Error);
      }
    }

    if (registration.options.lifecycle == 'resolution') {
      context.instances.set([token, argumentIdentity], instance);
    }

    if (registration.options.lifecycle == 'singleton') {
      registration.instances.set(argumentIdentity, instance);
    }

    context.resolutions.push({ instance, registration });
    context.resolving.delete([token, argumentIdentity]);

    if (isFirst) {
      for (const fn of context.forwardRefQueue.consume()) {
        (fn as () => void)();
      }

      derefForwardRefs(context);

      for (let i = context.resolutions.length - 1; i >= 0; i--) {
        const resolution = context.resolutions[i]!;

        if (isFunction((resolution.instance as AfterResolve | undefined)?.[afterResolve])) {
          const returnValue = (resolution.instance as AfterResolve)[afterResolve]!();

          if (isPromise(returnValue)) {
            throw new ResolveError(`Cannot execute async [afterResolve] for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead.`, chain);
          }
        }

        if (isDefined(resolution.registration.options.initializer)) {
          const returnValue = resolution.registration.options.initializer(resolution.instance);

          if (isPromise(returnValue)) {
            throw new ResolveError(`Cannot execute async initializer for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead.`, chain);
          }
        }
      }
    }

    return instance;
  }

  // eslint-disable-next-line max-statements, max-lines-per-function, complexity
  private async _resolveAsync<T, A>(token: InjectionToken<T, A>, optional: boolean | undefined, _argument: InjectableArgument<T, A> | undefined, context: InternalResolveContext, chain: ResolveChain, isFirst: boolean): Promise<T> {
    if ((chain.length > 750) || (++context.resolves > 750)) {
      throw new ResolveError('Resolve stack overflow. This can happen on circular dependencies with transient lifecycles and self reference. Use scoped or singleton lifecycle instead or @forwardRef().', chain);
    }

    if (isUndefined(token)) {
      throw new ResolveError('Token is undefined - this might be because of circular dependencies, use alias or forwardRef in this case.', chain);
    }

    if (context.providedInstances.has(token)) {
      return context.providedInstances.get(token) as T;
    }

    const registration = this.tryGetRegistration(token);

    if (isUndefined(registration)) {
      if (optional == true) {
        return undefined as unknown as T;
      }

      throw new ResolveError(`No provider for ${getTokenName(token)} registered.`, chain);
    }

    const resolveArgument = _argument ?? registration.options.defaultArgument ?? (await registration.options.defaultArgumentProvider?.(this.getResolveContext(context, chain)));

    const argumentIdentity = (isDefined(registration.options.argumentIdentityProvider) && ((registration.options.lifecycle == 'resolution') || (registration.options.lifecycle == 'singleton')))
      ? await registration.options.argumentIdentityProvider(resolveArgument)
      : resolveArgument;

    if ((registration.options.lifecycle == 'resolution') && context.instances.has([token, argumentIdentity])) {
      return context.instances.get([token, argumentIdentity]) as T;
    }

    if ((registration.options.lifecycle == 'singleton') && registration.instances.has(argumentIdentity)) {
      return registration.instances.get(argumentIdentity)!;
    }

    if (context.resolving.has([token, argumentIdentity])) {
      throw new ResolveError('Circular dependency to itself detected. Please check your registrations and providers. @forwardRef might be a solution.', chain);
    }

    context.resolving.set([token, argumentIdentity], true);

    let instance!: T;

    if (isClassProvider(registration.provider)) {
      const typeMetadata = reflectionRegistry.getMetadata(registration.provider.useClass);

      if (isUndefined(typeMetadata) || !typeMetadata.data.has(injectMetadataSymbol)) {
        throw new ResolveError(`${registration.provider.useClass.name} is not injectable.`, chain);
      }

      if (isStubClass(typeMetadata.constructor)) {
        throw new ResolveError(`No provider for ${getTokenName(token)} registered.`, chain);
      }

      const boxedParameters = await toArrayAsync(mapAsync(typeMetadata.parameters ?? [], async (metadata) => this.resolveInjectionAsync(context, typeMetadata, metadata, resolveArgument, chain)));
      const parameters = boxedParameters.map((box) => box.resolved);

      instance = new (typeMetadata.constructor as Constructor)(...parameters) as T;

      for (const [property, metadata] of typeMetadata.properties) {
        if (!metadata.data.has(injectMetadataSymbol)) {
          continue;
        }

        (instance as Record)[property as string] = (await this.resolveInjectionAsync(context, typeMetadata, metadata, resolveArgument, chain)).resolved;
      }
    }

    if (isValueProvider(registration.provider)) {
      instance = registration.provider.useValue;
    }

    if (isTokenProvider(registration.provider)) {
      const arg = resolveArgument ?? registration.provider.argument ?? await registration.provider.argumentProvider?.();
      const innerToken = registration.provider.useToken ?? await registration.provider.useTokenProvider();

      instance = await this._resolveAsync<T, A>(innerToken, false, arg, context, chain.addToken(innerToken), false);
    }

    if (isFactoryProvider(registration.provider)) {
      try {
        instance = await registration.provider.useFactory(resolveArgument, this.getResolveContext(context, chain));
      }
      catch (error) {
        throw new ResolveError('Error in factory.', chain, error as Error);
      }
    }

    if (registration.options.lifecycle == 'resolution') {
      context.instances.set([token, argumentIdentity], instance);
    }

    if (registration.options.lifecycle == 'singleton') {
      registration.instances.set(argumentIdentity, instance);
    }

    context.resolutions.push({ instance, registration });
    context.resolving.delete([token, argumentIdentity]);

    if (isFirst) {
      for (const fn of context.forwardRefQueue.consume()) {
        await fn();
      }

      derefForwardRefs(context);

      for (let i = context.resolutions.length - 1; i >= 0; i--) {
        const resolution = context.resolutions[i]!;

        if (isFunction((resolution.instance as AfterResolve | undefined)?.[afterResolve])) {
          await (resolution.instance as AfterResolve)[afterResolve]!();
        }

        if (isDefined(resolution.registration.options.initializer)) {
          await resolution.registration.options.initializer(resolution.instance);
        }
      }
    }

    return instance;
  }

  private resolveInjection(token: InjectionToken, context: InternalResolveContext, typeMetadata: TypeMetadata, metadata: ConstructorParameterMetadata | PropertyMetadata, resolveArgument: any, chain: ResolveChain): unknown {
    const getChain = (metadata.metadataType == 'constructor-parameter')
      ? (injectToken: InjectionToken | undefined) => chain.addParameter(typeMetadata.constructor, metadata.index, injectToken!).addToken(injectToken!)
      : (injectToken: InjectionToken | undefined) => chain.addProperty(typeMetadata.constructor, metadata.key, injectToken!).addToken(injectToken!);

    const injectMetadata: InjectMetadata = metadata.data.tryGet(injectMetadataSymbol) ?? {};
    const injectToken = (injectMetadata.injectToken ?? metadata.type)!;

    if (isDefined(injectMetadata.injectArgumentMapper) && (!this.hasRegistration(injectToken) || isDefined(resolveArgument) || isUndefined(injectToken))) {
      const mapped = injectMetadata.injectArgumentMapper(resolveArgument);

      if (isPromise(mapped)) {
        throw new ResolveError(`Cannot evaluate async argument mapper for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead.`, getChain(injectToken));
      }

      return mapped;
    }

    const parameterResolveArgument = injectMetadata.forwardArgumentMapper?.(resolveArgument) ?? injectMetadata.resolveArgumentProvider?.(this.getResolveContext(context, getChain(injectToken)));

    if (isPromise(parameterResolveArgument)) {
      throw new ResolveError(`Cannot evaluate async argument provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead.`, getChain(injectToken));
    }

    if (isDefined(injectMetadata.forwardRefToken)) {
      const forwardRef = ForwardRef.create();
      const forwardRefToken = injectMetadata.forwardRefToken;

      context.forwardRefQueue.add(() => {
        const forwardToken = isFunction(forwardRefToken) ? forwardRefToken() as InjectionToken : forwardRefToken;

        if (isDefined(injectMetadata.mapper)) {
          throw new ResolveError('Cannot use inject mapper with forwardRef.', getChain(forwardToken));
        }

        const resolved = this._resolve(forwardToken, injectMetadata.optional, parameterResolveArgument, context, getChain(forwardToken), false);
        ForwardRef.setRef(forwardRef, resolved);
      });

      context.forwardRefs.add(forwardRef);
      return forwardRef;
    }

    const resolved = this._resolve(injectToken, injectMetadata.optional, parameterResolveArgument, context, getChain(injectToken), false);
    return isDefined(injectMetadata.mapper) ? injectMetadata.mapper(resolved) : resolved;
  }

  private async resolveInjectionAsync(context: InternalResolveContext, typeMetadata: TypeMetadata, metadata: ConstructorParameterMetadata | PropertyMetadata, resolveArgument: any, chain: ResolveChain): Promise<{ resolved: unknown }> {
    const getChain = (metadata.metadataType == 'constructor-parameter')
      ? (injectToken: InjectionToken | undefined) => chain.addParameter(typeMetadata.constructor, metadata.index, injectToken!).addToken(injectToken!)
      : (injectToken: InjectionToken | undefined) => chain.addProperty(typeMetadata.constructor, metadata.key, injectToken!).addToken(injectToken!);

    const injectMetadata: InjectMetadata = metadata.data.tryGet(injectMetadataSymbol) ?? {};
    const injectToken = (injectMetadata.injectToken ?? metadata.type)!;

    if (isDefined(injectMetadata.injectArgumentMapper) && (!this.hasRegistration(injectToken) || isDefined(resolveArgument) || isUndefined(injectToken))) {
      return { resolved: injectMetadata.injectArgumentMapper(resolveArgument) };
    }

    const parameterResolveArgument = await (injectMetadata.forwardArgumentMapper?.(resolveArgument) ?? injectMetadata.resolveArgumentProvider?.(this.getResolveContext(context, getChain(injectToken))));

    if (isDefined(injectMetadata.forwardRefToken)) {
      const forwardRef = ForwardRef.create();
      const forwardRefToken = injectMetadata.forwardRefToken;

      context.forwardRefQueue.add(async () => {
        const forwardToken = isFunction(forwardRefToken) ? forwardRefToken() as InjectionToken : forwardRefToken;

        if (isDefined(injectMetadata.mapper)) {
          throw new ResolveError('Cannot use inject mapper with forwardRef.', getChain(forwardToken));
        }

        const resolved = await this._resolveAsync(forwardToken, injectMetadata.optional, parameterResolveArgument, context, getChain(forwardToken), false);
        ForwardRef.setRef(forwardRef, resolved);
      });

      context.forwardRefs.add(forwardRef);
      return { resolved: forwardRef };
    }

    const resolved = await this._resolveAsync(injectToken, injectMetadata.optional, parameterResolveArgument, context, getChain(injectToken), false);
    return { resolved: isDefined(injectMetadata.mapper) ? injectMetadata.mapper(resolved) : resolved };
  }

  private getResolveContext(resolveContext: InternalResolveContext, chain: ResolveChain): ResolveContext {
    const context: ResolveContext = {
      isAsync: resolveContext.isAsync,
      resolve: (token, argument, instances) => {
        this.addInstancesToResolveContext(instances, resolveContext);
        return this._resolve(token, false, argument, resolveContext, chain.addToken(token), false);
      },
      resolveAsync: async (token, argument, instances) => {
        this.addInstancesToResolveContext(instances, resolveContext);
        return this._resolveAsync(token, false, argument, resolveContext, chain.addToken(token), false);
      }
    };

    return context;
  }

  private addInstancesToResolveContext(instances: [InjectionToken, any][] | undefined, resolveContext: InternalResolveContext): void {
    if (isUndefined(instances)) {
      return;
    }

    for (const [instanceToken, instance] of instances) {
      resolveContext.providedInstances.set(instanceToken, instance);
    }
  }
}

function derefForwardRefs(context: InternalResolveContext): void {
  for (const resolution of context.resolutions) {
    if (!(typeof resolution.instance == 'object')) {
      continue;
    }

    for (const [key, value] of objectEntries(resolution.instance as Record)) {
      if (!context.forwardRefs.has(value as ForwardRef)) {
        continue;
      }

      (resolution.instance as Record)[key] = ForwardRef.deref(value);
    }
  }
}

export const container = new Container();
