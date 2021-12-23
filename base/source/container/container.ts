import { CircularBuffer, MultiKeyMap } from '#/data-structures';
import type { Constructor } from '#/types';
import { mapAsync, toArrayAsync } from '#/utils/async-iterable-helpers';
import { hasOwnProperty } from '#/utils/object';
import { ForwardRef, setRef } from '#/utils/object/forward-ref';
import { getParameterTypes } from '#/utils/reflection';
import { assertDefinedPass, isDefined, isFunction, isObject, isPromise, isUndefined } from '#/utils/type-guards';
import type { InjectionToken, Provider } from './types';
import { isAsyncFactoryProvider, isClassProvider, isFactoryProvider, isFunctionOrConstructorInjectionToken, isStringInjectionToken, isTokenProvider, isValueProvider } from './types';

type ResolveContext = {
  forwardRefQueue: CircularBuffer<() => void | Promise<void>>,
  resolutions: { instance: any, registration: Registration }[],
  instances: MultiKeyMap<[InjectionToken, any], any>
};

type ResolveChainParameterNode = {
  parametersCount: number,
  index: number,
  token: InjectionToken
};

type ResolveChainNode = InjectionToken | ResolveChainParameterNode | undefined;

type ResolveChain = ResolveChainNode[];

export type ForwardRefInjectionToken<T = any, P = any> = Exclude<InjectionToken<T, P>, Function> | (() => InjectionToken<T, P>); // eslint-disable-line @typescript-eslint/ban-types

/**
 * transient: a new instance will be created with each resolve
 * singleton: each resolve will return the same instance
 * resolution: the same instance will be resolved for each resolution of this dependency during a single resolution chain
 */
export type Lifecycle = 'transient' | 'singleton' | 'resolution';

export type ParameterTypeInfo = {
  token: InjectionToken,
  injectToken?: InjectionToken,
  injectArgument?: any,
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
    const parameterTypes = assertDefinedPass(getParameterTypes(constructor), 'could not reflect parameter types') as any[];

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
   * resolve a token
   * @param token token to resolve
   * @param argument argument used for resolving (overrides token and default arguments)
   * @returns
   */
  resolve<T, P = any>(token: InjectionToken<T, P>, argument?: P): T {
    const context: ResolveContext = {
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      instances: new MultiKeyMap()
    };

    return this._resolve(token, argument, context, [token], true);
  }

  /**
   * resolve a token
   * @param token token to resolve
   * @param argument argument used for resolving (overrides token and default arguments)
   * @returns
   */
  async resolveAsync<T, P = any>(token: InjectionToken<T, P>, argument?: P): Promise<T> {
    const context: ResolveContext = {
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      instances: new MultiKeyMap()
    };

    return this._resolveAsync(token, argument, context, [token], true);
  }

  // eslint-disable-next-line max-statements, max-lines-per-function, complexity
  private _resolve<T, P>(token: InjectionToken<T, P>, argument: P | undefined, context: ResolveContext, chain: ResolveChain, isFirst: boolean): T {
    if (isUndefined(token)) {
      throw new Error(`token is undefined - this might be because of circular dependencies, use alias and forwardRef in this case - chain: ${getChainString(chain)}`);
    }

    const registration = this.registrations.get(token) as Registration<T, P>;

    if (isUndefined(registration)) {
      throw new Error(`no provider for ${getTokenName(token)} registered - chain: ${getChainString(chain)}`);
    }

    if ((registration.options.lifecycle == 'resolution') && context.instances.has([token, argument])) {
      return context.instances.get([token, argument]) as T;
    }

    if ((registration.options.lifecycle == 'singleton') && registration.instances.has(argument)) {
      return registration.instances.get(argument)!;
    }

    let instance!: T;

    if (isClassProvider(registration.provider)) {
      const typeInfo = typeInfos.get(registration.provider.useClass);

      if (isUndefined(typeInfo)) {
        throw new Error(`${registration.provider.useClass.name} is not injectable - chain: ${getChainString(chain)}`);
      }

      const parameters = typeInfo.parameters.map((parameterInfo, index): unknown => {
        const parameterToken = parameterInfo.injectToken ?? parameterInfo.token;

        if (isDefined(parameterInfo.forwardRefToken)) {
          const forwardRef = ForwardRef.create();
          const forwardRefToken = parameterInfo.forwardRefToken;

          context.forwardRefQueue.add(() => {
            const forwardToken = isFunction(forwardRefToken) ? forwardRefToken() : forwardRefToken;
            const resolved = this._resolve(forwardToken, parameterInfo.injectArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: forwardToken }, forwardToken], false);
            forwardRef[setRef](resolved as object);
          });

          return forwardRef;
        }

        return this._resolve(parameterToken, parameterInfo.injectArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: parameterToken }, parameterToken], false);
      });

      instance = new typeInfo.constructor(...parameters) as T;
    }

    if (isValueProvider(registration.provider)) {
      instance = registration.provider.useValue;
    }

    if (isTokenProvider(registration.provider)) {
      instance = this._resolve<T, P>(registration.provider.useToken, argument ?? registration.provider.argument ?? registration.options.defaultArgument, context, [...chain, registration.provider.useToken], false);
    }

    if (isFactoryProvider(registration.provider)) {
      instance = registration.provider.useFactory(this, argument ?? registration.options.defaultArgument);
    }

    if (isAsyncFactoryProvider(registration.provider)) {
      throw new Error(`cannot resolve async provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead - chain: ${getChainString(chain)}`);
    }

    if (registration.options.lifecycle != 'transient') {
      context.instances.set([token, argument], instance);
    }

    if (registration.options.lifecycle == 'singleton') {
      registration.instances.set(argument, instance);
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
  private async _resolveAsync<T, P>(token: InjectionToken<T, P>, argument: P | undefined, context: ResolveContext, chain: ResolveChain, isFirst: boolean): Promise<T> {
    if (isUndefined(token)) {
      throw new Error(`token is undefined - this might be because of circular dependencies, use alias and forwardRef in this case - chain: ${getChainString(chain)}`);
    }

    const registration = this.registrations.get(token) as Registration<T, P>;

    if (isUndefined(registration)) {
      throw new Error(`no provider for ${getTokenName(token)} registered - chain: ${getChainString(chain)}`);
    }

    if ((registration.options.lifecycle == 'resolution') && context.instances.has([token, argument])) {
      return context.instances.get([token, argument]) as T;
    }

    if ((registration.options.lifecycle == 'singleton') && registration.instances.has(argument)) {
      return registration.instances.get(argument)!;
    }

    let instance!: T;

    if (isClassProvider(registration.provider)) {
      const typeInfo = typeInfos.get(registration.provider.useClass);

      if (isUndefined(typeInfo)) {
        throw new Error(`${registration.provider.useClass.name} is not injectable - chain: ${getChainString(chain)}`);
      }

      const parameters = await toArrayAsync(mapAsync(typeInfo.parameters, async (parameterInfo, index): Promise<unknown> => {
        const parameterToken = parameterInfo.injectToken ?? parameterInfo.token;

        if (isDefined(parameterInfo.forwardRefToken)) {
          const forwardRef = ForwardRef.create();
          const forwardRefToken = parameterInfo.forwardRefToken;

          context.forwardRefQueue.add(async () => {
            const forwardToken = isFunction(forwardRefToken) ? forwardRefToken() : forwardRefToken;
            const resolved = await this._resolveAsync(forwardToken, parameterInfo.injectArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: forwardToken }, forwardToken], false);
            forwardRef[setRef](resolved as object);
          });

          return forwardRef;
        }

        return this._resolveAsync(parameterToken, parameterInfo.injectArgument, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: parameterToken }, parameterToken], false);
      }));

      instance = new typeInfo.constructor(...parameters) as T;
    }

    if (isValueProvider(registration.provider)) {
      instance = registration.provider.useValue;
    }

    if (isTokenProvider(registration.provider)) {
      instance = await this._resolveAsync<T, P>(registration.provider.useToken, argument ?? registration.provider.argument ?? registration.options.defaultArgument, context, [...chain, registration.provider.useToken], false);
    }

    if (isFactoryProvider(registration.provider)) {
      instance = registration.provider.useFactory(this, argument ?? registration.options.defaultArgument);
    }

    if (isAsyncFactoryProvider(registration.provider)) {
      instance = await registration.provider.useAsyncFactory(this, argument ?? registration.options.defaultArgument);
    }

    if (registration.options.lifecycle != 'transient') {
      context.instances.set([token, argument], instance);
    }

    if (registration.options.lifecycle == 'singleton') {
      registration.instances.set(argument, instance);
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
  return isUndefined(token)
    ? 'undefined'
    : isFunctionOrConstructorInjectionToken(token)
      ? token.name
      : isStringInjectionToken(token)
        ? `"${token}"`
        : token.toString();
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
