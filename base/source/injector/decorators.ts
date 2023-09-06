/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { createClassDecorator, createDecorator } from '#/reflection/index.js';
import type { Constructor, OneOrMany, Record, Simplify, TypedOmit } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { isDefined, isFunction } from '#/utils/type-guards.js';
import { Injector } from './injector.js';
import type { Provider } from './provider.js';
import { injectMetadataSymbol, injectableMetadataSymbol } from './symbols.js';
import type { InjectionToken } from './token.js';
import type { InjectMetadata } from './type-info.js';
import type { ArgumentProvider, ForwardRefInjectionToken, Mapper, RegistrationOptions } from './types.js';

export type InjectDecorator = Decorator<'accessor' | 'constructorParameter'>;

export type InjectableOptions<T, A, C extends Record = Record> = RegistrationOptions<T, A, C> & {
  /** aliases (tokens) for the class. Useful for example for circular dependencies when you can't use the class itself as a token */
  alias?: OneOrMany<InjectionToken>,

  /** custom provider. Useful for example if initialization is required */
  provider?: Provider<T, A, C>
};

export type InjectableOptionsWithoutLifecycle<T, A> = Simplify<TypedOmit<InjectableOptions<T, A>, 'lifecycle'>>;

/**
 * Helper decorator to replace a class definition with an other
 * can be used for example to type external classes with the {@link Resolvable} interface
 * @param constructor class to replace with
 */
export function ReplaceClass<T>(constructor: Constructor<T>): ClassDecorator {
  return createClassDecorator({ handler: () => constructor });
}

/**
 * Globally registers the class for injection
 * @param options registration options
 */
export function Injectable<T = any, A = any, C extends Record = Record>(options: InjectableOptions<T, A, C> = {}): ClassDecorator {
  return createClassDecorator({
    data: { [injectableMetadataSymbol]: {} },
    mergeData: true,
    handler: (data) => {
      const { alias: aliases, provider, ...registrationOptions } = options;
      const token = data.constructor as Constructor;

      const targetProvider: Provider = provider ?? { useClass: token };
      Injector.register(token, targetProvider, registrationOptions);

      if (isDefined(aliases)) {
        for (const alias of toArray(aliases)) {
          Injector.register(alias, { useToken: token }, registrationOptions);
        }
      }
    }
  });
}

/**
 * registers the class in the global container with singleton lifecycle. Decorated class is not modified in any way
 * @param options registration options
 */
export function Singleton<T = any, A = any>(options: InjectableOptionsWithoutLifecycle<T, A> = {}): ClassDecorator {
  return Injectable({ ...options, lifecycle: 'singleton' });
}

/**
 * registers the class in the global container with scoped lifecycle. Decorated class is not modified in any way
 * @param options registration options
 */
export function Scoped<T = any, A = any>(lifecycle: 'resolution' | 'injector', options: InjectableOptionsWithoutLifecycle<T, A> = {}): ClassDecorator {
  return Injectable({ ...options, lifecycle });
}

/**
 * sets the token used to resolve the parameter
 * @param token token used for resolving
 * @param argument resolve argument
 * @param mapperOrKey map the resolved value. If {@link PropertyKey} is provided, that property of the resolved value will be injected
 */
export function Inject<T, A>(token?: InjectionToken<T, A>, argument?: A, mapperOrKey?: Mapper<T> | keyof T): InjectDecorator {
  const injectMetadata: InjectMetadata = {};

  if (isDefined(token)) {
    injectMetadata.injectToken = token;
  }

  if (isDefined(argument)) {
    injectMetadata.resolveArgumentProvider = () => argument;
  }

  if (isDefined(mapperOrKey)) {
    injectMetadata.mapper = isFunction(mapperOrKey) ? mapperOrKey : ((value: any) => (value as Record<any, unknown>)[mapperOrKey]);
  }

  return createInjectDecorator(injectMetadata);
}

/**
 * sets the token used to resolve the parameter. Resolves all providers
 * @param token token used for resolving
 * @param argument resolve argument
 * @param mapperOrKey map the resolved value. If {@link PropertyKey} is provided, that property of the resolved value will be injected
 */
export function InjectAll<T, A>(token?: InjectionToken<T, A>, argument?: A, mapperOrKey?: Mapper<T> | keyof T): InjectDecorator {
  const injectMetadata: InjectMetadata = { resolveAll: true };

  if (isDefined(token)) {
    injectMetadata.injectToken = token;
  }

  if (isDefined(argument)) {
    injectMetadata.resolveArgumentProvider = () => argument;
  }

  if (isDefined(mapperOrKey)) {
    injectMetadata.mapper = isFunction(mapperOrKey) ? mapperOrKey : ((value: any) => (value as Record<any, unknown>)[mapperOrKey]);
  }

  return createInjectDecorator(injectMetadata);
}

/**
 * sets the argument used for resolving the parameter
 * @param argument
 */
export function ResolveArg<T>(argument: T): InjectDecorator {
  return ResolveArgProvider(() => argument);
}

/**
 * sets the argument provider used for resolving the parameter
 * @param argumentProvider
 */
export function ResolveArgProvider<T>(argumentProvider: ArgumentProvider<T>): InjectDecorator {
  return createInjectDecorator({ resolveArgumentProvider: argumentProvider });
}

/**
 * injects the argument used for resolving the class instead of resolving the parameter
 * @param argument
 * @param mapperOrKey map the resolved value. If {@link PropertyKey} is provided, that property of the resolved value will be injected
 */
export function InjectArg<T>(mapperOrKey?: Mapper<T> | keyof T): InjectDecorator {
  return createInjectDecorator({
    injectArgumentMapper: isFunction(mapperOrKey)
      ? mapperOrKey
      : isDefined(mapperOrKey)
        ? ((value: T) => (value as Record<any, unknown>)[mapperOrKey])
        : ((value: T) => value)
  });
}

/**
 * sets the argument used for resolving the decorated parameter to the the argument provided for parent resolve
 * @param mapper map the argument (for example to select a property instead of forwarding the whole object)
 */
export function ForwardArg(): InjectDecorator;
export function ForwardArg<T, U>(mapper: Mapper<T, U>): InjectDecorator;
export function ForwardArg(mapper: Mapper = (value): unknown => value): InjectDecorator {
  return createInjectDecorator({ forwardArgumentMapper: mapper });
}

/**
 * marks the argument as optional
 * @param argument
 */
export function Optional(): InjectDecorator {
  return createInjectDecorator({ optional: true });
}

/**
 * resolve using ForwardRef to handle circular dependencies. Resolve logic derefs all ForwardRefs which are direct properties of resolved instances automatically
 * @param token token to resolve
 * @param argument resolve argument
 */
export function ForwardRef<T extends object, A>(token?: ForwardRefInjectionToken<T>, argument?: A, options?: Pick<InjectMetadata, 'forwardRefTypeHint'>): InjectDecorator {
  const injectMetadata: InjectMetadata = {
    forwardRef: token ?? true,
    forwardRefTypeHint: options?.forwardRefTypeHint
  };

  if (isDefined(argument)) {
    injectMetadata.resolveArgumentProvider = () => argument;
  }

  return createInjectDecorator(injectMetadata);
}

function createInjectDecorator(metadata: InjectMetadata): InjectDecorator {
  return createDecorator({
    property: true,
    accessor: true,
    constructorParameter: true,
    data: { [injectMetadataSymbol]: metadata },
    mergeData: true
  });
}
