import { CircularBuffer, MultiKeyMap } from '#/data-structures';
import type { Constructor } from '#/types';
import { mapAsync, toArrayAsync } from '#/utils/async-iterable-helpers';
import { hasOwnProperty } from '#/utils/object';
import { ForwardRef, setRef } from '#/utils/object/forward-ref';
import { getParameterTypes } from '#/utils/reflection';
import { assertDefinedPass, isDefined, isFunction, isObject, isPromise, isString, isUndefined } from '#/utils/type-guards';
import type { InjectionToken, Provider } from './types';
import { isAsyncFactoryProvider, isClassProvider, isFactoryProvider, isTokenProvider, isValueProvider } from './types';

type ResolveContext = {
  forwardRefQueue: CircularBuffer<() => void | Promise<void>>,
  resolutions: { instance: any, registration: Registration }[],
  providedInstances: Map<InjectionToken, any>,
  instances: MultiKeyMap<[InjectionToken, any], any>
};

type ResolveChainParameterNode = {
  parametersCount: number,
  index: number,
  token: InjectionToken
};

type ResolveChainNode = InjectionToken | ResolveChainParameterNode | undefined;

type ResolveChain = ResolveChainNode[];

export type ForwardArgumentMapper<T = unknown, U = any> = (argument: T) => U;

export type ArgumentProvider<T> = (container: Container) => T;

export type ForwardRefInjectionToken<T = any, P = any> = Exclude<InjectionToken<T, P>, Function> | (() => InjectionToken<T, P>); // eslint-disable-line @typescript-eslint/ban-types

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
  injectArgument?: any,
  forwardArgumentMapper?: ForwardArgumentMapper,
  forwardRefToken?: ForwardRefInjectionToken
};

export type TypeInfo = {
  constructor: Constructor,
  parameters: ParameterTypeInfo[]
};

export type RegistrationOptions<T, P = any> = {
  lifecycle?: Lifecycle,

  /** default resolve argument used when neither token nor explizit resolve argument is provided */
  defaultArgument?: P,

  /** default resolve argument used when neither token nor explizit resolve argument is provided */
  defaultArgumentProvider?: ArgumentProvider<P>,

  /** function which gets called after a resolve */
  initializer?: (instance: T) => any | Promise<any>
};

export type Registration<T = any, P = any> = {
  provider: Provider<T, P>,
  options: RegistrationOptions<T, P>,
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

export function setParameterInjectArgument(constructor: Constructor, parameterIndex: number, argument: any): void {
  const registration = getOrCreateRegistration(constructor);
  assertDefinedPass(registration.parameters[parameterIndex]).injectArgument = argument;
}

export function setParameterForwardArgumentMapper(constructor: Constructor, parameterIndex: number, mapper: ForwardArgumentMapper): void {
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
  register<T, P = any>(token: InjectionToken<T, P>, provider: Provider<T, P>, options?: RegistrationOptions<T>): void {
    if (isClassProvider(provider)) {
      if (!typeInfos.has(provider.useClass)) {
        throw new Error(`${provider.useClass.name} is not injectable`);
      }
    }

    this.registrations.set(token, { provider, options: { lifecycle: 'transient', ...options }, instances: new Map() });
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
  resolve<T, P = any>(token: InjectionToken<T, P>, argument?: P, instances?: [InjectionToken, any][]): T {
    const context: ResolveContext = {
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      providedInstances: new Map(instances),
      instances: new MultiKeyMap()
    };

    return this._resolve(token, false, argument, context, [token], true);
  }

  /**
   * resolve a token
   * @param token token to resolve
   * @param argument argument used for resolving (overrides token and default arguments)
   * @returns
   */
  async resolveAsync<T, P = any>(token: InjectionToken<T, P>, argument?: P, instances?: [InjectionToken, any][]): Promise<T> {
    const context: ResolveContext = {
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      providedInstances: new Map(instances),
      instances: new MultiKeyMap()
    };

    return this._resolveAsync(token, false, argument, context, [token], true);
  }

  // eslint-disable-next-line max-statements, max-lines-per-function, complexity
  private _resolve<T, P>(token: InjectionToken<T, P>, optional: boolean | undefined, _argument: P | undefined, context: ResolveContext, chain: ResolveChain, isFirst: boolean): T {
    if (isUndefined(token)) {
      throw new Error(`token is undefined - this might be because of circular dependencies, use alias and forwardRef in this case - chain: ${getChainString(chain)}`);
    }

    if (context.providedInstances.has(token)) {
      return context.providedInstances.get(token) as T;
    }

    const registration = this.registrations.get(token) as Registration<T, P>;

    if (isUndefined(registration)) {
      if (optional == true) {
        return undefined as unknown as T;
      }

      throw new Error(`no provider for ${getTokenName(token)} registered - chain: ${getChainString(chain)}`);
    }

    const resolveArgument = _argument ?? registration.options.defaultArgument ?? registration.options.defaultArgumentProvider?.(this);

    if ((registration.options.lifecycle == 'resolution') && context.instances.has([token, resolveArgument])) {
      return context.instances.get([token, resolveArgument]) as T;
    }

    if ((registration.options.lifecycle == 'singleton') && registration.instances.has(resolveArgument)) {
      return registration.instances.get(resolveArgument)!;
    }

    let instance!: T;

    if (isClassProvider(registration.provider)) {
      const typeInfo = typeInfos.get(registration.provider.useClass);

      if (isUndefined(typeInfo)) {
        throw new Error(`${registration.provider.useClass.name} is not injectable - chain: ${getChainString(chain)}`);
      }

      const parameters = typeInfo.parameters.map((parameterInfo, index): unknown => {
        const injectArgument = parameterInfo.forwardArgumentMapper?.(resolveArgument) ?? parameterInfo.injectArgument;

        if (isDefined(parameterInfo.forwardRefToken)) {
          const forwardRef = ForwardRef.create();
          const forwardRefToken = parameterInfo.forwardRefToken;

          context.forwardRefQueue.add(() => {
            const forwardToken = isFunction(forwardRefToken) ? forwardRefToken() : forwardRefToken;
            const resolved = this._resolve(forwardToken, parameterInfo.optional, injectArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: forwardToken }, forwardToken], false);
            forwardRef[setRef](resolved as object);
          });

          return forwardRef;
        }

        const parameterToken = parameterInfo.injectToken ?? parameterInfo.token;
        return this._resolve(parameterToken, parameterInfo.optional, injectArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: parameterToken }, parameterToken], false);
      });

      instance = new typeInfo.constructor(...parameters) as T;
    }

    if (isValueProvider(registration.provider)) {
      instance = registration.provider.useValue;
    }

    if (isTokenProvider(registration.provider)) {
      const arg = resolveArgument ?? registration.provider.argument ?? registration.provider.argumentProvider?.();
      const innerToken = registration.provider.useToken ?? registration.provider.useTokenProvider();

      instance = this._resolve<T, P>(innerToken, false, arg, context, [...chain, registration.provider.useToken], false);
    }

    if (isFactoryProvider(registration.provider)) {
      instance = registration.provider.useFactory(resolveArgument, this);
    }

    if (isAsyncFactoryProvider(registration.provider)) {
      throw new Error(`cannot resolve async provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead - chain: ${getChainString(chain)}`);
    }

    if (registration.options.lifecycle == 'resolution') {
      context.instances.set([token, resolveArgument], instance);
    }

    if (registration.options.lifecycle == 'singleton') {
      registration.instances.set(resolveArgument, instance);
    }

    context.resolutions.push({ instance, registration });

    if (isFirst) {
      for (const fn of context.forwardRefQueue.consume()) {
        (fn as () => void)();
      }

      for (let i = context.resolutions.length - 1; i >= 0; i--) {
        const resolution = context.resolutions[i]!;

        if (isDefined(resolution.registration.options.initializer)) {
          const returnValue = resolution.registration.options.initializer(resolution.instance);

          if (isPromise(returnValue)) {
            throw new Error(`cannot execute async initializer for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead - chain: ${getChainString(chain)}`);
          }
        }
      }
    }

    return instance;
  }

  // eslint-disable-next-line max-statements, max-lines-per-function, complexity
  private async _resolveAsync<T, P>(token: InjectionToken<T, P>, optional: boolean | undefined, _argument: P | undefined, context: ResolveContext, chain: ResolveChain, isFirst: boolean): Promise<T> {
    if (isUndefined(token)) {
      throw new Error(`token is undefined - this might be because of circular dependencies, use alias and forwardRef in this case - chain: ${getChainString(chain)}`);
    }

    if (context.providedInstances.has(token)) {
      return context.providedInstances.get(token) as T;
    }

    const registration = this.registrations.get(token) as Registration<T, P>;

    if (isUndefined(registration)) {
      if (optional == true) {
        return undefined as unknown as T;
      }

      throw new Error(`no provider for ${getTokenName(token)} registered - chain: ${getChainString(chain)}`);
    }

    const resolveArgument = _argument ?? registration.options.defaultArgument ?? registration.options.defaultArgumentProvider?.(this);

    if ((registration.options.lifecycle == 'resolution') && context.instances.has([token, resolveArgument])) {
      return context.instances.get([token, resolveArgument]) as T;
    }

    if ((registration.options.lifecycle == 'singleton') && registration.instances.has(resolveArgument)) {
      return registration.instances.get(resolveArgument)!;
    }

    let instance!: T;

    if (isClassProvider(registration.provider)) {
      const typeInfo = typeInfos.get(registration.provider.useClass);

      if (isUndefined(typeInfo)) {
        throw new Error(`${registration.provider.useClass.name} is not injectable - chain: ${getChainString(chain)}`);
      }

      const parameters = await toArrayAsync(mapAsync(typeInfo.parameters, async (parameterInfo, index): Promise<unknown> => {
        const injectArgument = parameterInfo.forwardArgumentMapper?.(resolveArgument) ?? parameterInfo.injectArgument;

        if (isDefined(parameterInfo.forwardRefToken)) {
          const forwardRef = ForwardRef.create();
          const forwardRefToken = parameterInfo.forwardRefToken;

          context.forwardRefQueue.add(async () => {
            const forwardToken = isFunction(forwardRefToken) ? forwardRefToken() : forwardRefToken;
            const resolved = await this._resolveAsync(forwardToken, parameterInfo.optional, injectArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: forwardToken }, forwardToken], false);
            forwardRef[setRef](resolved as object);
          });

          return forwardRef;
        }

        const parameterToken = parameterInfo.injectToken ?? parameterInfo.token;
        return this._resolveAsync(parameterToken, parameterInfo.optional, injectArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: parameterToken }, parameterToken], false);
      }));

      instance = new typeInfo.constructor(...parameters) as T;
    }

    if (isValueProvider(registration.provider)) {
      instance = registration.provider.useValue;
    }

    if (isTokenProvider(registration.provider)) {
      const arg = resolveArgument ?? registration.provider.argument ?? registration.provider.argumentProvider?.();
      const innerToken = registration.provider.useToken ?? registration.provider.useTokenProvider();

      instance = await this._resolveAsync<T, P>(innerToken, false, arg, context, [...chain, registration.provider.useToken], false);
    }

    if (isFactoryProvider(registration.provider)) {
      instance = registration.provider.useFactory(resolveArgument, this);
    }

    if (isAsyncFactoryProvider(registration.provider)) {
      instance = await registration.provider.useAsyncFactory(resolveArgument, this);
    }

    if (registration.options.lifecycle == 'resolution') {
      context.instances.set([token, resolveArgument], instance);
    }

    if (registration.options.lifecycle == 'singleton') {
      registration.instances.set(resolveArgument, instance);
    }

    context.resolutions.push({ instance, registration });

    if (isFirst) {
      for (const fn of context.forwardRefQueue.consume()) {
        (fn as () => void)();
      }

      for (let i = context.resolutions.length - 1; i >= 0; i--) {
        const resolution = context.resolutions[i]!;

        if (isDefined(resolution.registration.options.initializer)) {
          const returnValue = resolution.registration.options.initializer(resolution.instance);

          if (isPromise(returnValue)) {
            throw new Error(`cannot execute async initializer for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead - chain: ${getChainString(chain)}`);
          }
        }
      }
    }

    return instance;
  }
}

function getTokenName(token: InjectionToken | undefined): string {
  return isFunction(token)
    ? token.name
    : isString(token)
      ? `"${token}"`
      : String(token);
}

function getChainString(chain: ResolveChain): string {
  let chainString = '';

  for (const node of chain) {
    if (isResolveChainParameterNode(node)) {
      chainString += `(${'_, '.repeat(node.index)}${getTokenName(node.token)}${', _'.repeat(node.parametersCount - node.index - 1)})`;
    }
    else {
      chainString += `\n  -> ${getTokenName(node)}`;
    }
  }

  return chainString;
}

function isResolveChainParameterNode(node: ResolveChainNode): node is ResolveChainParameterNode {
  return isObject(node)
    && hasOwnProperty(node as ResolveChainParameterNode, 'token')
    && hasOwnProperty(node as ResolveChainParameterNode, 'index')
    && hasOwnProperty(node as ResolveChainParameterNode, 'parametersCount');
}

export const container = new Container();
