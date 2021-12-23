import { CircularBuffer } from '#/data-structures';
import type { Constructor, Record } from '#/types';
import { mapAsync, toArrayAsync } from '#/utils/async-iterable-helpers';
import { hasOwnProperty } from '#/utils/object';
import { ForwardRef, setRef } from '#/utils/object/forward-ref';
import { getParameterTypes } from '#/utils/reflection';
import { assertDefinedPass, isDefined, isFunction, isObject, isPromise, isUndefined } from '#/utils/type-guards';
import type { InjectionToken, Provider } from './types';
import { isAsyncFactoryProvider, isClassProvider, isConstructorInjectionToken, isFactoryProvider, isParameterizedInjectionToken, isStringInjectionToken, isTokenProvider, isValueProvider } from './types';

type ResolveChainParameterNode = {
  parametersCount: number,
  index: number,
  token: InjectionToken
};

type ResolveContext = {
  forwardRefQueue: CircularBuffer<() => void | Promise<void>>,
  resolutions: { instance: any, registration: Registration }[],
  instances: Map<InjectionToken, any>
};

type ResolveChainNode = InjectionToken | ResolveChainParameterNode | undefined;

type ResolveChain = ResolveChainNode[];

export type ForwardRefInjectionToken<T = any, P = any> = Exclude<InjectionToken<T, P>, Function> | (() => InjectionToken<T, P>); // eslint-disable-line @typescript-eslint/ban-types

export type Lifecycle = 'transient' | 'singleton' | 'resolution';

type TypeInfo = {
  constructor: Constructor,
  parameters: (Constructor | InjectionToken)[],
  parameterInjectionTokens: Record<number, InjectionToken>,
  forwardedParameters: Map<number, ForwardRefInjectionToken>
};

export type RegistrationOptions<T> = {
  lifecycle?: Lifecycle,
  initializer?: (instance: T) => any | Promise<any>
};

export type Registration<T = any> = {
  provider: Provider<T>,
  options: RegistrationOptions<T>,
  instance?: T
};

const typeInfos = new Map<Constructor, TypeInfo>();

function getOrCreateRegistration(constructor: Constructor): TypeInfo {
  if (!typeInfos.has(constructor)) {
    const registration: TypeInfo = {
      constructor,
      parameters: assertDefinedPass(getParameterTypes(constructor), 'could not reflect parameter types') as any[],
      parameterInjectionTokens: {},
      forwardedParameters: new Map()
    };

    typeInfos.set(constructor, registration);
  }

  return typeInfos.get(constructor)!;
}

export function setTypeInfo(constructor: Constructor): void {
  getOrCreateRegistration(constructor);
}

export function defineParameterInjectionToken(constructor: Constructor, parameterIndex: number, token: InjectionToken): void {
  const registration = getOrCreateRegistration(constructor);
  registration.parameterInjectionTokens[parameterIndex] = token;
}


export function defineParameterForwarded(constructor: Constructor, parameterIndex: number, token: ForwardRefInjectionToken): void {
  const registration = getOrCreateRegistration(constructor);
  registration.forwardedParameters.set(parameterIndex, token);
}

export class Container {
  private readonly registrations: Map<InjectionToken, Registration>;

  constructor() {
    this.registrations = new Map();
  }

  register<T, P>(token: InjectionToken<T, P>, provider: Provider<T, P>, options?: RegistrationOptions<T>): void {
    if (isClassProvider(provider)) {
      if (!typeInfos.has(provider.useClass)) {
        throw new Error(`${provider.useClass.name} is not injectable`);
      }
    }

    this.registrations.set(token, { provider, options: { lifecycle: 'transient', ...options } });
  }

  resolve<T, P>(token: InjectionToken<T, P>): T {
    const context: ResolveContext = {
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      instances: new Map()
    };

    return this._resolve(token, context, [token], true);
  }

  async resolveAsync<T, P>(token: InjectionToken<T, P>): Promise<T> {
    const context: ResolveContext = {
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      instances: new Map()
    };

    return this._resolveAsync(token, context, [token], true);
  }

  // eslint-disable-next-line max-statements, max-lines-per-function, complexity
  private _resolve<T, P>(_token: InjectionToken<T, P>, context: ResolveContext, chain: ResolveChain, isFirst: boolean): T {
    if (isUndefined(_token)) {
      throw new Error(`token is undefined - this might be because of circular dependencies, use alias and forwardRef in this case - chain: ${getChainString(chain)}`);
    }

    const token = isParameterizedInjectionToken(_token) ? _token.token : _token;
    const parameterizedTokenParameters = isParameterizedInjectionToken(_token) ? _token.parameter : undefined;

    const registration = this.registrations.get(token);

    if (isUndefined(registration)) {
      throw new Error(`no provider for ${getTokenName(token)} registered - chain: ${getChainString(chain)}`);
    }

    if ((registration.options.lifecycle == 'resolution') && context.instances.has(token)) {
      return context.instances.get(token) as T;
    }

    if ((registration.options.lifecycle == 'singleton') && isDefined(registration.instance)) {
      return registration.instance as T;
    }

    let instance!: T;

    if (isClassProvider(registration.provider)) {
      const typeInfo = typeInfos.get(registration.provider.useClass);

      if (isUndefined(typeInfo)) {
        throw new Error(`${registration.provider.useClass.name} is not injectable - chain: ${getChainString(chain)}`);
      }

      const parameters = typeInfo.parameters.map((parameter, index): unknown => {
        const parameterToken = typeInfo.parameterInjectionTokens[index] ?? (parameter as Constructor);

        if (typeInfo.forwardedParameters.has(index)) {
          const forwardRef = ForwardRef.create();
          const forwardRefToken = typeInfo.forwardedParameters.get(index)!;

          context.forwardRefQueue.add(() => {
            const forwardToken = isFunction(forwardRefToken) ? forwardRefToken() : forwardRefToken;
            const resolved = this._resolve(forwardToken, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: forwardToken }, forwardToken], false);
            forwardRef[setRef](resolved as object);
          });

          return forwardRef;
        }

        return this._resolve(parameterToken, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: parameterToken }, parameterToken], false);
      });

      instance = new typeInfo.constructor(...parameters) as T;
      context.instances.set(token, instance);
    }

    if (isValueProvider(registration.provider)) {
      instance = registration.provider.useValue as T;
    }

    if (isTokenProvider(registration.provider)) {
      instance = this._resolve<T, P>(registration.provider.useToken, context, [...chain, registration.provider.useToken], false);
    }

    if (isFactoryProvider(registration.provider)) {
      instance = registration.provider.useFactory(this, parameterizedTokenParameters) as T;
    }

    if (isAsyncFactoryProvider(registration.provider)) {
      throw new Error(`cannot resolve async provider for token ${getTokenName(token)} in synchronous resolve, use resolveAsync instead - chain: ${getChainString(chain)}`);
    }

    context.instances.set(token, instance);

    if (registration.options.lifecycle == 'singleton') {
      registration.instance = instance;
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
  private async _resolveAsync<T, P>(_token: InjectionToken<T, P>, context: ResolveContext, chain: ResolveChain, isFirst: boolean): Promise<T> {
    if (isUndefined(_token)) {
      throw new Error(`token is undefined - this might be because of circular dependencies, use alias and forwardRef in this case - chain: ${getChainString(chain)}`);
    }

    const token = isParameterizedInjectionToken(_token) ? _token.token : _token;
    const parameterizedTokenParameters = isParameterizedInjectionToken(_token) ? _token.parameter : undefined;

    const registration = this.registrations.get(token);

    if (isUndefined(registration)) {
      throw new Error(`no provider for ${getTokenName(token)} registered - chain: ${getChainString(chain)}`);
    }

    if ((registration.options.lifecycle == 'resolution') && context.instances.has(token)) {
      return context.instances.get(token) as T;
    }

    if ((registration.options.lifecycle == 'singleton') && isDefined(registration.instance)) {
      return registration.instance as T;
    }

    let instance!: T;

    if (isClassProvider(registration.provider)) {
      const typeInfo = typeInfos.get(registration.provider.useClass);

      if (isUndefined(typeInfo)) {
        throw new Error(`${registration.provider.useClass.name} is not injectable - chain: ${getChainString(chain)}`);
      }

      const parameters = await toArrayAsync(mapAsync(typeInfo.parameters, async (parameter, index): Promise<unknown> => {
        const parameterToken = typeInfo.parameterInjectionTokens[index] ?? (parameter as Constructor);

        if (typeInfo.forwardedParameters.has(index)) {
          const forwardRef = ForwardRef.create();
          const forwardRefToken = typeInfo.forwardedParameters.get(index)!;

          context.forwardRefQueue.add(async () => {
            const forwardToken = isFunction(forwardRefToken) ? forwardRefToken() : forwardRefToken;
            const resolved = await this._resolveAsync(forwardToken, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: forwardToken }, forwardToken], false);
            forwardRef[setRef](resolved as object);
          });

          return forwardRef;
        }

        return this._resolveAsync(parameterToken, context, [...chain, { parametersCount: typeInfo.parameters.length, index, token: parameterToken }, parameterToken], false);
      }));

      instance = new typeInfo.constructor(...parameters) as T;
      context.instances.set(token, instance);
    }

    if (isValueProvider(registration.provider)) {
      instance = registration.provider.useValue as T;
    }

    if (isTokenProvider(registration.provider)) {
      instance = await this._resolveAsync<T, P>(registration.provider.useToken, context, [...chain, registration.provider.useToken], false);
    }

    if (isFactoryProvider(registration.provider)) {
      instance = registration.provider.useFactory(this, parameterizedTokenParameters) as T;
    }

    if (isAsyncFactoryProvider(registration.provider)) {
      instance = await registration.provider.useAsyncFactory(this, parameterizedTokenParameters) as T;
    }

    context.instances.set(token, instance);

    if (registration.options.lifecycle == 'singleton') {
      registration.instance = instance;
    }

    context.resolutions.push({ instance, registration });

    if (isFirst) {
      for (const fn of context.forwardRefQueue.consume()) {
        await fn();
      }

      for (let i = context.resolutions.length - 1; i >= 0; i--) {
        const resolution = context.resolutions[i]!;

        if (isDefined(resolution.registration.options.initializer)) {
          await resolution.registration.options.initializer(resolution.instance);
        }
      }
    }

    return instance;
  }
}

function getTokenName(token: InjectionToken | undefined): string {
  return isUndefined(token)
    ? 'undefined'
    : isConstructorInjectionToken(token)
      ? token.name
      : isStringInjectionToken(token)
        ? `"${token}"`
        : isParameterizedInjectionToken(token)
          ? getTokenName(token.token)
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
