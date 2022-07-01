/* eslint-disable @typescript-eslint/ban-types */
import { createClassDecorator, createDecorator } from '#/reflection';
import type { Decorator } from '#/reflection';
import type { Constructor, OneOrMany, Simplify, TypedExtract, TypedOmit } from '#/types';
import { toArray } from '#/utils/array';
import { isDefined, isFunction } from '#/utils/type-guards';
import type { Lifecycle, RegistrationOptions } from './container';
import { container, injectMetadataSymbol } from './container';
import type { Provider } from './provider';
import type { InjectionToken } from './token';
import type { InjectMetadata } from './type-info';
import type { ArgumentProvider, ForwardRefInjectionToken, Mapper } from './types';

type InjectDecorator = Decorator<'property' | 'accessor' | 'constructorParameter'>;

export type InjectableOptions<T, A> = RegistrationOptions<T> & {
  /** aliases (tokens) for the class. Useful for example for circular dependencies when you can't use the class itself as a token */
  alias?: OneOrMany<InjectionToken>,

  /** custom provider. Useful for example if initialization is required */
  provider?: Provider<T, A>
};

export type InjectableOptionsWithoutLifecycle<T, A> = Simplify<TypedOmit<InjectableOptions<T, A>, 'lifecycle'>>;

/**
 * Helper decorator to replace a class definition with an other
 * can be used for example to type external classes with the {@link Injectable} interface
 * @param constructor class to replace with
 */
export function replaceClass<T>(constructor: Constructor<T>): ClassDecorator {
  return createClassDecorator({ handler: () => constructor });
}

/**
 * registers the class in the global container. Decorated class is not modified in any way
 * @param options registration options
 */
export function injectable<T = any, A = any>(options: InjectableOptions<T, A> = {}): ClassDecorator {
  return createClassDecorator({
    data: { [injectMetadataSymbol]: {} as InjectMetadata },
    mergeData: true,
    handler: (data) => {
      const { alias: aliases, provider, ...registrationOptions } = options;

      const targetProvider: Provider = provider ?? { useClass: data.constructor };
      container.register(data.constructor, targetProvider, registrationOptions);

      if (isDefined(aliases)) {
        for (const alias of toArray(aliases)) {
          container.register(alias, { useToken: data.constructor }, registrationOptions);
        }
      }
    }
  });
}

/**
 * registers the class in the global container with singleton lifecycle. Decorated class is not modified in any way
 * @param options registration options
 */
export function singleton<T = any, A = any>(options: InjectableOptionsWithoutLifecycle<T, A> = {}): ClassDecorator {
  return injectable({ ...options, lifecycle: 'singleton' });
}

/**
 * registers the class in the global container with scoped lifecycle. Decorated class is not modified in any way
 * @param options registration options
 */
export function scoped<T = any, A = any>(lifecycle: Simplify<TypedExtract<Lifecycle, 'resolution'>>, options: InjectableOptionsWithoutLifecycle<T, A> = {}): ClassDecorator {
  return injectable({ ...options, lifecycle });
}

/**
 * sets the token used to resolve the parameter
 * @param token token used for resolving
 * @param argument resolve argument
 * @param mapperOrKey map the resolved value. If {@link PropertyKey} is provided, that property of the resolved value will be injected
 */
export function inject<T, A>(token?: InjectionToken<T, A>, argument?: A, mapperOrKey?: Mapper<T> | keyof T): InjectDecorator {
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
 * sets the argument used for resolving the parameter
 * @param argument
 */
export function resolveArg<T>(argument: T): InjectDecorator {
  return resolveArgProvider(() => argument);
}

/**
 * sets the argument provider used for resolving the parameter
 * @param argumentProvider
 */
export function resolveArgProvider<T>(argumentProvider: ArgumentProvider<T>): InjectDecorator {
  return createInjectDecorator({ resolveArgumentProvider: argumentProvider });
}

/**
 * injects the argument used for resolving the class instead of resolving the parameter
 * @param argument
 * @param mapperOrKey map the resolved value. If {@link PropertyKey} is provided, that property of the resolved value will be injected
 */
export function injectArg<T>(mapperOrKey?: Mapper<T> | keyof T): InjectDecorator {
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
export function forwardArg(): InjectDecorator;
export function forwardArg<T, U>(mapper: Mapper<T, U>): InjectDecorator;
export function forwardArg(mapper: Mapper = (value): unknown => value): InjectDecorator {
  return createInjectDecorator({ forwardArgumentMapper: mapper });
}

/**
 * marks the argument as optional
 * @param argument
 */
export function optional(): InjectDecorator {
  return createInjectDecorator({ optional: true });
}

/**
 * resolve using ForwardRef to handle circular dependencies. Resolve logic derefs all ForwardRefs which are direct properties of resolved instances automatically
 * @param token token to resolve
 * @param argument resolve argument
 */
export function forwardRef<T, A>(token: ForwardRefInjectionToken<T>, argument?: A): InjectDecorator {
  const injectMetadata: InjectMetadata = {
    forwardRefToken: token
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
