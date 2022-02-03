import { CircularBuffer, MultiKeyMap } from '#/data-structures';
import type { Constructor, Record, TypedOmit } from '#/types';
import { mapAsync, toArrayAsync } from '#/utils/async-iterable-helpers';
import { ForwardRef, setRef } from '#/utils/object/forward-ref';
import { getParameterTypes } from '#/utils/reflection';
import { assertDefinedPass, isDefined, isFunction, isPromise, isUndefined } from '#/utils/type-guards';
import { ResolveError } from './resolve.error';
import type { AfterResolve, FactoryContext, Injectable, InjectableArgument, InjectionToken, Provider, ResolveChain } from './types';
import { afterResolve, isAsyncFactoryProvider, isClassProvider, isFactoryProvider, isTokenProvider, isValueProvider } from './types';
import { getTokenName, truncateChain } from './utils';

type ResolveContext = {
  forwardRefQueue: CircularBuffer<() => void | Promise<void>>,
  resolutions: { instance: any, registration: Registration }[],
  forwardRefs: Set<ForwardRef>,
  providedInstances: Map<InjectionToken, any>,
  instances: MultiKeyMap<[InjectionToken, any], any>,
  resolving: Set<InjectionToken>
};

export type ArgumentMapper<T = unknown, U = any> = (argument: T) => U | Promise<U>;

export type ArgumentProvider<T = unknown> = (container: Container) => T | Promise<T>;

export type ForwardRefInjectionToken<T = any, A = any> = Exclude<InjectionToken<T, A>, Function> | (() => InjectionToken<T, A>); // eslint-disable-line @typescript-eslint/ban-types

/**
 * transient: a new instance will be created with each resolve
 * singleton: each resolve will return the same instance
 * resolution: the same instance will be resolved for each resolution of this dependency during a single resolution chain
 */
export type Lifecycle = 'transient' | 'singleton' | 'resolution';

export type ParameterTypeInfo = {
  token: InjectionToken,
  optional?: boolean,
  injectToken?: InjectionToken,
  resolveArgumentProvider?: ArgumentProvider,
  injectArgumentMapper?: ArgumentMapper,
  forwardArgumentMapper?: ArgumentMapper,
  forwardRefToken?: ForwardRefInjectionToken
};

export type TypeInfo = {
  constructor: Constructor,
  parameters: ParameterTypeInfo[]
};

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
  argumentIdentityProvider?: ArgumentMapper<InjectableArgument<T, A> | undefined>,

  /** function which gets called after a resolve */
  initializer?: (instance: T) => any | Promise<any>
};

export type Registration<T = any, A = any> = {
  provider: Provider<T, A>,
  options: RegistrationOptions<T, A>,
  instances: Map<any, T>
};

const typeInfos = new Map<Constructor, TypeInfo>();

function getOrCreateRegistration(constructor: Constructor): TypeInfo {
  if (!typeInfos.has(constructor)) {
    const parameterTypes: any[] = getParameterTypes(constructor) ?? [];

    const registration: TypeInfo = {
      constructor,
      parameters: parameterTypes.map((type): ParameterTypeInfo => ({ token: type }))
    };

    typeInfos.set(constructor, registration);
  }

  return typeInfos.get(constructor)!;
}

export function registerTypeInfo(constructor: Constructor): TypeInfo {
  return getOrCreateRegistration(constructor);
}

export function getTypeInfo(constructor: Constructor): TypeInfo {
  return assertDefinedPass(typeInfos.get(constructor), 'constructor not registered');
}

export function setTypeInfo(constructor: Constructor, typeInfo: TypeInfo): void {
  typeInfos.set(constructor, typeInfo);
}

export function setParameterInjectionToken(constructor: Constructor, parameterIndex: number, token: InjectionToken): void {
  const registration = getOrCreateRegistration(constructor);
  assertDefinedPass(registration.parameters[parameterIndex]).injectToken = token;
}

export function setParameterForwardRefToken(constructor: Constructor, parameterIndex: number, forwardRefToken: ForwardRefInjectionToken): void {
  const registration = getOrCreateRegistration(constructor);
  assertDefinedPass(registration.parameters[parameterIndex]).forwardRefToken = forwardRefToken;
}

export function setParameterResolveArgumentProvider(constructor: Constructor, parameterIndex: number, argumentProvider: ArgumentProvider): void {
  const registration = getOrCreateRegistration(constructor);
  assertDefinedPass(registration.parameters[parameterIndex]).resolveArgumentProvider = argumentProvider;
}

export function setParameterInjectArgumentMapper(constructor: Constructor, parameterIndex: number, mapper: ArgumentMapper): void {
  const registration = getOrCreateRegistration(constructor);
  assertDefinedPass(registration.parameters[parameterIndex]).injectArgumentMapper = mapper;
}

export function setParameterForwardArgumentMapper(constructor: Constructor, parameterIndex: number, mapper: ArgumentMapper): void {
  const registration = getOrCreateRegistration(constructor);
  assertDefinedPass(registration.parameters[parameterIndex]).forwardArgumentMapper = mapper;
}

export function setParameterOptional(constructor: Constructor, parameterIndex: number): void {
  const registration = getOrCreateRegistration(constructor);
  assertDefinedPass(registration.parameters[parameterIndex]).optional = true;
}

export class Container {
  private readonly registrations: Map<InjectionToken, Registration>;

  constructor() {
    this.registrations = new Map();
  }

  /**
   * register a provider for a token
   * @param token token to register
   * @param provider provider used to resolve the token
   * @param options registration options
   */
  register<T, A = any>(token: InjectionToken<T, A>, provider: Provider<T, A>, options?: RegistrationOptions<T, A>): void {
    if (isClassProvider(provider)) {
      if (!typeInfos.has(provider.useClass)) {
        throw new Error(`${provider.useClass.name} is not injectable`);
      }
    }

    this.registrations.set(token, { provider, options: { lifecycle: 'transient', ...options }, instances: new Map() });
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
    return this.registrations.has(token);
  }

  /**
   * resolve a token
   * @param token token to resolve
   * @param argument argument used for resolving (overrides token and default arguments)
   * @returns
   */
  resolve<T, A = T extends Injectable<infer AInject> ? AInject : any>(token: InjectionToken<T, A>, argument?: T extends Injectable<infer AInject> ? AInject : A, instances?: [InjectionToken, any][]): T {
    const context: ResolveContext = {
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      forwardRefs: new Set(),
      providedInstances: new Map(instances),
      instances: new MultiKeyMap(),
      resolving: new Set()
    };

    return this._resolve(token, false, argument, context, [token], true);
  }

  /**
   * resolve a token
   * @param token token to resolve
   * @param argument argument used for resolving (overrides token and default arguments)
   * @returns
   */
  async resolveAsync<T, A = T extends Injectable<infer AInject> ? AInject : any>(token: InjectionToken<T, A>, argument?: T extends Injectable<infer AInject> ? AInject : A, instances?: [InjectionToken, any][]): Promise<T> {
    const context: ResolveContext = {
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      forwardRefs: new Set(),
      providedInstances: new Map(instances),
      instances: new MultiKeyMap(),
      resolving: new Set()
    };

    return this._resolveAsync(token, false, argument, context, [token], true);
  }

  // eslint-disable-next-line max-statements, max-lines-per-function, complexity
  private _resolve<T, A>(token: InjectionToken<T, A>, optional: boolean | undefined, _argument: InjectableArgument<T, A> | undefined, context: ResolveContext, chain: ResolveChain, isFirst: boolean): T {
    if (context.resolving.has(token)) {
      throw new ResolveError('circular dependency to itself detected. Please check your registrations and providers', truncateChain(chain, 15));
    }

    context.resolving.add(token);

    if (chain.length > 10000) {
      throw new ResolveError('resolve stack overflow. This can happen on circular dependencies with transient lifecycles. Use scoped or singleton lifecycle instead', truncateChain(chain, 15));
    }

    if (isUndefined(token)) {
      throw new ResolveError('token is undefined - this might be because of circular dependencies, use alias and forwardRef in this case', chain);
    }

    if (context.providedInstances.has(token)) {
      return context.providedInstances.get(token) as T;
    }

    const registration = this.registrations.get(token) as Registration<T, A>;

    if (isUndefined(registration)) {
      if (optional == true) {
        return undefined as unknown as T;
      }

      throw new ResolveError(`no provider for ${getTokenName(token)} registered`, chain);
    }

    const resolveArgument = _argument ?? registration.options.defaultArgument ?? registration.options.defaultArgumentProvider?.(this);

    if (isPromise(resolveArgument)) {
      throw new ResolveError(`cannot evaluate async argument provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead`, chain);
    }

    const argumentIdentity = (isDefined(registration.options.argumentIdentityProvider) && ((registration.options.lifecycle == 'resolution') || (registration.options.lifecycle == 'singleton')))
      ? registration.options.argumentIdentityProvider(resolveArgument)
      : resolveArgument;

    if (isPromise(argumentIdentity)) {
      throw new ResolveError(`cannot evaluate async argument identity provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead`, chain);
    }

    if ((registration.options.lifecycle == 'resolution') && context.instances.has([token, argumentIdentity])) {
      return context.instances.get([token, argumentIdentity]) as T;
    }

    if ((registration.options.lifecycle == 'singleton') && registration.instances.has(argumentIdentity)) {
      return registration.instances.get(argumentIdentity)!;
    }

    let instance!: T;

    if (isClassProvider(registration.provider)) {
      const typeInfo = typeInfos.get(registration.provider.useClass);

      if (isUndefined(typeInfo)) {
        throw new ResolveError(`${registration.provider.useClass.name} is not injectable`, chain);
      }

      const parameters = typeInfo.parameters.map((parameterInfo, index): unknown => {
        if (isDefined(parameterInfo.injectArgumentMapper)) {
          const mapped = parameterInfo.injectArgumentMapper(resolveArgument);

          if (isPromise(mapped)) {
            throw new ResolveError(`cannot evaluate async argument mapper for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead`, [...chain, { parametersCount: typeInfo.parameters.length, index, token: parameterInfo.injectToken ?? parameterInfo.token }]);
          }

          return mapped;
        }

        const parameterResolveArgument = parameterInfo.forwardArgumentMapper?.(resolveArgument) ?? parameterInfo.resolveArgumentProvider?.(this);

        if (isPromise(parameterResolveArgument)) {
          throw new ResolveError(`cannot evaluate async argument provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead`, [...chain, { parametersCount: typeInfo.parameters.length, index, token: parameterInfo.injectToken ?? parameterInfo.token }]);
        }

        if (isDefined(parameterInfo.forwardRefToken)) {
          const forwardRef = ForwardRef.create();
          const forwardRefToken = parameterInfo.forwardRefToken;

          context.forwardRefQueue.add(() => {
            const forwardToken = isFunction(forwardRefToken) ? forwardRefToken() : forwardRefToken;
            const resolved = this._resolve(forwardToken, parameterInfo.optional, parameterResolveArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: forwardToken }, forwardToken], false);
            forwardRef[setRef](resolved as object);
          });

          context.forwardRefs.add(forwardRef);
          return forwardRef;
        }

        const parameterToken = parameterInfo.injectToken ?? parameterInfo.token;
        return this._resolve(parameterToken, parameterInfo.optional, parameterResolveArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: parameterToken }, parameterToken], false);
      });

      instance = new typeInfo.constructor(...parameters) as T;
    }

    if (isValueProvider(registration.provider)) {
      instance = registration.provider.useValue;
    }

    if (isTokenProvider(registration.provider)) {
      const arg = resolveArgument ?? registration.provider.argument ?? registration.provider.argumentProvider?.();
      const innerToken = registration.provider.useToken ?? registration.provider.useTokenProvider();

      instance = this._resolve<T, A>(innerToken, false, arg, context, [...chain, innerToken], false);
    }

    if (isFactoryProvider(registration.provider)) {
      try {
        instance = registration.provider.useFactory(resolveArgument, this.getFactoryContext(context, chain));
      }
      catch (error) {
        throw new ResolveError('error in factory', chain, error as Error);
      }
    }

    if (isAsyncFactoryProvider(registration.provider)) {
      throw new ResolveError(`cannot evaluate async factory provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead`, chain);
    }

    if (!isTokenProvider(registration.provider)) {
      if (registration.options.lifecycle == 'resolution') {
        context.instances.set([token, argumentIdentity], instance);
      }

      if (registration.options.lifecycle == 'singleton') {
        registration.instances.set(argumentIdentity, instance);
      }

      context.resolutions.push({ instance, registration });
    }

    context.resolving.delete(token);

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
            throw new ResolveError(`cannot execute async [afterResolve] for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead`, chain);
          }
        }

        if (isDefined(resolution.registration.options.initializer)) {
          const returnValue = resolution.registration.options.initializer(resolution.instance);

          if (isPromise(returnValue)) {
            throw new ResolveError(`cannot execute async initializer for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead`, chain);
          }
        }
      }
    }

    return instance;
  }

  // eslint-disable-next-line max-statements, max-lines-per-function, complexity
  private async _resolveAsync<T, A>(token: InjectionToken<T, A>, optional: boolean | undefined, _argument: InjectableArgument<T, A> | undefined, context: ResolveContext, chain: ResolveChain, isFirst: boolean): Promise<T> {
    if (context.resolving.has(token)) {
      throw new ResolveError('circular dependency to itself detected. Please check your registrations and providers', truncateChain(chain, 15));
    }

    context.resolving.add(token);

    if (chain.length > 10000) {
      throw new ResolveError('resolve stack overflow. This can happen on circular dependencies with transient lifecycles. Use scoped or singleton lifecycle instead', truncateChain(chain, 15));
    }

    if (isUndefined(token)) {
      throw new ResolveError('token is undefined - this might be because of circular dependencies, use alias and forwardRef in this case', chain);
    }

    if (context.providedInstances.has(token)) {
      return context.providedInstances.get(token) as T;
    }

    const registration = this.registrations.get(token) as Registration<T, A>;

    if (isUndefined(registration)) {
      if (optional == true) {
        return undefined as unknown as T;
      }

      throw new ResolveError(`no provider for ${getTokenName(token)} registered`, chain);
    }

    const resolveArgument = _argument ?? registration.options.defaultArgument ?? (await registration.options.defaultArgumentProvider?.(this));

    const argumentIdentity = (isDefined(registration.options.argumentIdentityProvider) && ((registration.options.lifecycle == 'resolution') || (registration.options.lifecycle == 'singleton')))
      ? await registration.options.argumentIdentityProvider(resolveArgument)
      : resolveArgument;

    if ((registration.options.lifecycle == 'resolution') && context.instances.has([token, argumentIdentity])) {
      return context.instances.get([token, argumentIdentity]) as T;
    }

    if ((registration.options.lifecycle == 'singleton') && registration.instances.has(argumentIdentity)) {
      return registration.instances.get(argumentIdentity)!;
    }

    let instance!: T;

    if (isClassProvider(registration.provider)) {
      const typeInfo = typeInfos.get(registration.provider.useClass);

      if (isUndefined(typeInfo)) {
        throw new ResolveError(`${registration.provider.useClass.name} is not injectable`, chain);
      }

      const parameters = await toArrayAsync(mapAsync(typeInfo.parameters, async (parameterInfo, index): Promise<unknown> => {
        if (isDefined(parameterInfo.injectArgumentMapper)) {
          return parameterInfo.injectArgumentMapper(resolveArgument);
        }

        const parameterResolveArgument = await (parameterInfo.forwardArgumentMapper?.(resolveArgument) ?? parameterInfo.resolveArgumentProvider?.(this));

        if (isDefined(parameterInfo.forwardRefToken)) {
          const forwardRef = ForwardRef.create();
          const forwardRefToken = parameterInfo.forwardRefToken;

          context.forwardRefQueue.add(async () => {
            const forwardToken = isFunction(forwardRefToken) ? forwardRefToken() : forwardRefToken;
            const resolved = await this._resolveAsync(forwardToken, parameterInfo.optional, parameterResolveArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: forwardToken }, forwardToken], false);
            forwardRef[setRef](resolved as object);
          });

          context.forwardRefs.add(forwardRef);
          return forwardRef;
        }

        const parameterToken = parameterInfo.injectToken ?? parameterInfo.token;
        return this._resolveAsync(parameterToken, parameterInfo.optional, parameterResolveArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: parameterToken }, parameterToken], false);
      }));

      instance = new typeInfo.constructor(...parameters) as T;
    }

    if (isValueProvider(registration.provider)) {
      instance = registration.provider.useValue;
    }

    if (isTokenProvider(registration.provider)) {
      const arg = resolveArgument ?? registration.provider.argument ?? registration.provider.argumentProvider?.();
      const innerToken = registration.provider.useToken ?? registration.provider.useTokenProvider();

      instance = await this._resolveAsync<T, A>(innerToken, false, arg, context, [...chain, innerToken], false);
    }

    if (isFactoryProvider(registration.provider)) {
      try {
        instance = registration.provider.useFactory(resolveArgument, this.getFactoryContext(context, chain));
      }
      catch (error) {
        throw new ResolveError('error in factory', chain, error as Error);
      }
    }

    if (isAsyncFactoryProvider(registration.provider)) {
      try {
        instance = await registration.provider.useAsyncFactory(resolveArgument, this.getFactoryContext(context, chain));
      }
      catch (error) {
        throw new ResolveError('error in factory', chain, error as Error);
      }
    }

    if (!isTokenProvider(registration.provider)) {
      if (registration.options.lifecycle == 'resolution') {
        context.instances.set([token, argumentIdentity], instance);
      }

      if (registration.options.lifecycle == 'singleton') {
        registration.instances.set(argumentIdentity, instance);
      }

      context.resolutions.push({ instance, registration });
    }

    context.resolving.delete(token);

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

  private getFactoryContext(resolveContext: ResolveContext, chain: ResolveChain): FactoryContext {
    const context: FactoryContext = {
      resolve: (token, argument, instances) => {
        this.addInstancesToResolveContext(instances, resolveContext);
        return this._resolve(token, false, argument, resolveContext, [...chain, token], false);
      },
      resolveAsync: async (token, argument, instances) => {
        this.addInstancesToResolveContext(instances, resolveContext);
        return this._resolveAsync(token, false, argument, resolveContext, [...chain, token], false);
      }
    };

    return context;
  }

  private addInstancesToResolveContext(instances: [InjectionToken, any][] | undefined, resolveContext: ResolveContext): void {
    if (isUndefined(instances)) {
      return;
    }

    for (const [instanceToken, instance] of instances) {
      resolveContext.providedInstances.set(instanceToken, instance);
    }
  }
}

function derefForwardRefs(context: ResolveContext): void {
  for (const resolution of context.resolutions) {
    if (!(typeof resolution.instance == 'object')) {
      continue;
    }

    for (const [key, value] of Object.entries(resolution.instance as Record)) {
      if (!context.forwardRefs.has(value as ForwardRef)) {
        continue;
      }

      (resolution.instance as Record)[key] = ForwardRef.deref(value);
    }
  }
}

export const container = new Container();
