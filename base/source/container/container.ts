import { CircularBuffer } from '#/data-structures';
import type { Constructor, Record } from '#/types';
import { assertDefinedPass, getParameterTypes, isDefined, isFunction, isPromise, isString, isSymbol, isUndefined } from '#/utils';
import { mapAsync, toArrayAsync } from '#/utils/async-iterable-helpers';
import { ForwardRef, setRef } from '#/utils/object/forward-ref';
import type { InjectionToken, Provider } from './types';
import { isAsyncFactoryProvider, isClassProvider, isConstructorInjectionToken, isFactoryProvider, isStringInjectionToken, isTokenProvider, isValueProvider } from './types';

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

export type ForwardRefInjectionToken<T = any> = Exclude<InjectionToken<T>, Function> | (() => InjectionToken<T>);

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

  register<T>(token: InjectionToken<T>, provider: Provider<T>, options?: RegistrationOptions<T>): void {
    if (isClassProvider(provider)) {
      if (!typeInfos.has(provider.useClass)) {
        throw new Error(`${provider.useClass.name} is not injectable`);
      }
    }

    this.registrations.set(token, { provider, options: { lifecycle: 'transient', ...options } });
  }

  resolve<T>(token: InjectionToken<T>): T {
    const context: ResolveContext = {
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      instances: new Map()
    };

    return this._resolve(token, context, [token], true);
  }

  async resolveAsync<T>(token: InjectionToken<T>): Promise<T> {
    const context: ResolveContext = {
      forwardRefQueue: new CircularBuffer(),
      resolutions: [],
      instances: new Map()
    };

    return this._resolveAsync(token, context, [token], true);
  }

  // eslint-disable-next-line max-statements, max-lines-per-function
  private _resolve<T>(token: InjectionToken<T>, context: ResolveContext, chain: ResolveChain, isFirst: boolean): T {
    if (isUndefined(token)) {
      throw new Error(`token is undefined - this might be because of circular dependencies, use alias and forwardRef in this case - chain: ${getChainString(chain)}`);
    }

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

      const parameters = typeInfo.parameters.map((parameter, index): any => {
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
      instance = this._resolve<T>(registration.provider.useToken, context, [...chain, registration.provider.useToken], false);
    }

    if (isFactoryProvider(registration.provider)) {
      instance = registration.provider.useFactory(this) as T;
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

  // eslint-disable-next-line max-statements, max-lines-per-function
  private async _resolveAsync<T>(token: InjectionToken<T>, context: ResolveContext, chain: ResolveChain, isFirst: boolean): Promise<T> {
    if (isUndefined(token)) {
      throw new Error(`token is undefined - this might be because of circular dependencies, use alias and forwardRef in this case - chain: ${getChainString(chain)}`);
    }

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

      const parameters = await toArrayAsync(mapAsync(typeInfo.parameters, async (parameter, index) => {
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
      instance = await this._resolveAsync<T>(registration.provider.useToken, context, [...chain, registration.provider.useToken], false);
    }

    if (isFactoryProvider(registration.provider)) {
      instance = registration.provider.useFactory(this) as T;
    }

    if (isAsyncFactoryProvider(registration.provider)) {
      instance = await registration.provider.useAsyncFactory(this) as T;
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
        : token.toString();
}

function getChainString(chain: ResolveChain): string {
  let chainString = '';

  for (const node of chain) {
    if (isFunction(node) || isString(node) || isSymbol(node) || isUndefined(node)) {
      chainString += `\n  -> ${getTokenName(node)}`;
    }
    else {
      chainString += `(${'_, '.repeat(node.index)}${getTokenName(node.token)}${', _'.repeat(node.parametersCount - node.index - 1)})`;
    }
  }

  return chainString;
}

export const container = new Container();
