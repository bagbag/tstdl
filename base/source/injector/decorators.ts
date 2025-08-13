/* eslint-disable @typescript-eslint/naming-convention */

import { createClassDecorator, createDecorator, reflectionRegistry, type Decorator } from '#/reflection/index.js';
import type { Constructor, OneOrMany, Record, Simplify, TypedOmit } from '#/types/index.js';
import { toArray } from '#/utils/array/array.js';
import { isDefined, isFunction, isNotNull } from '#/utils/type-guards.js';
import { Injector } from './injector.js';
import type { ResolveArgument } from './interfaces.js';
import type { Provider } from './provider.js';
import { injectMetadataSymbol, injectableMetadataSymbol, injectableOptionsSymbol } from './symbols.js';
import type { InjectionToken } from './token.js';
import type { InjectMetadata } from './type-info.js';
import type { AfterResolveContext, ArgumentProvider, ForwardRefInjectionToken, Mapper, RegistrationOptions } from './types.js';

export type InjectDecorator = Decorator<'accessor' | 'constructorParameter'>;

export type InjectableOptions<T, A, C extends Record = Record> = RegistrationOptions<T, A, C> & {
  /** Aliases (tokens) for the class. Useful for example for circular dependencies when you can't use the class itself as a token */
  alias?: OneOrMany<InjectionToken>,

  /** Custom provider. Useful for example if initialization is required */
  provider?: Provider<T, A, C>,
};

export type InjectableOptionsWithoutLifecycle<T, A, C extends Record = Record> = Simplify<TypedOmit<InjectableOptions<T, A, C>, 'lifecycle'>>;

/**
 * Helper decorator to replace a class definition with an other
 * can be used for example to type external classes with the {@link Resolvable} interface
 * @param constructor class to replace with
 */
export function ReplaceClass<T>(constructor: Constructor<T>): ClassDecorator {
  return createClassDecorator({ handler: () => constructor });
}

export function InjectableOptions<T = any, A = any, C extends Record = Record>(options: InjectableOptions<T, A, C>): ClassDecorator {
  return createClassDecorator({
    data: { [injectableOptionsSymbol]: options },
    mergeData: true,
  });
}

/**
 * Globally registers the class for injection
 * @param options registration options
 */
export function Injectable<T = any, A = any, C extends Record = Record>(options: InjectableOptions<T, A, C> = {}): ClassDecorator {
  return createClassDecorator({
    data: {
      [injectableMetadataSymbol]: {},
      [injectableOptionsSymbol]: options,
    },
    mergeData: true,
    handler: (data, metadata) => {
      const { alias: aliases, provider, ...registrationOptions } = options;
      const token = data.constructor as Constructor;

      let mergedRegistationOptions = registrationOptions;

      if (isNotNull(metadata.parent)) {
        const parentOptions = reflectionRegistry.getMetadata(metadata.parent)?.data.tryGet<InjectableOptions<T, A, C>>(injectableOptionsSymbol);

        if (isDefined(parentOptions)) {
          const { alias: _, provider: __, ...parentRegistrationOptions } = parentOptions;

          mergedRegistationOptions = {
            ...parentRegistrationOptions,
            ...registrationOptions,
            providers: [...(parentRegistrationOptions.providers ?? []), ...(registrationOptions.providers ?? [])],
            afterResolve: (instance: T, argument: ResolveArgument<T, A>, context: AfterResolveContext<C>) => {
              parentRegistrationOptions.afterResolve?.(instance, argument, context);
              registrationOptions.afterResolve?.(instance, argument, context);
            },
            metadata: {
              ...parentRegistrationOptions.metadata,
              ...registrationOptions.metadata,
            },
          };
        }
      }

      const targetProvider: Provider<T, A> = provider ?? { useClass: token };
      Injector.register(token, targetProvider, mergedRegistationOptions);

      if (isDefined(aliases)) {
        for (const alias of toArray(aliases)) {
          Injector.register(alias, { useToken: token });
        }
      }
    },
  });
}

/**
 * Registers the class in the global container with singleton lifecycle. Decorated class is not modified in any way
 * @param options registration options
 */
export function Singleton<T = any, A = any, C extends Record = Record>(options: InjectableOptionsWithoutLifecycle<T, A, C> = {}): ClassDecorator {
  return Injectable({ ...options, lifecycle: 'singleton' });
}

/**
 * Registers the class in the global container with scoped lifecycle. Decorated class is not modified in any way
 * @param options registration options
 */
export function Scoped<T = any, A = any, C extends Record = Record>(lifecycle: 'resolution' | 'injector', options: InjectableOptionsWithoutLifecycle<T, A, C> = {}): ClassDecorator {
  return Injectable({ ...options, lifecycle });
}

/**
 * Sets the token used to resolve the parameter
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
 * Sets the token used to resolve the parameter. Resolves all providers
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
 * Sets the argument used for resolving the parameter
 * @param argument
 */
export function ResolveArg<T>(argument: T): InjectDecorator {
  return ResolveArgProvider(() => argument);
}

/**
 * Sets the argument provider used for resolving the parameter
 * @param argumentProvider
 */
export function ResolveArgProvider<T>(argumentProvider: ArgumentProvider<T>): InjectDecorator {
  return createInjectDecorator({ resolveArgumentProvider: argumentProvider });
}

/**
 * Injects the argument used for resolving the class instead of resolving the parameter
 * @param argument
 * @param mapperOrKey map the resolved value. If {@link PropertyKey} is provided, that property of the resolved value will be injected
 */
export function InjectArg<T>(mapperOrKey?: Mapper<T> | keyof T): InjectDecorator {
  return createInjectDecorator({
    injectArgumentMapper: isFunction(mapperOrKey)
      ? mapperOrKey
      : isDefined(mapperOrKey)
        ? (value: T) => (value as Record<any, unknown>)[mapperOrKey]
        : (value: T) => value,
  });
}

/**
 * Sets the argument used for resolving the decorated parameter to the the argument provided for parent resolve
 * @param mapper map the argument (for example to select a property instead of forwarding the whole object)
 */
export function ForwardArg(): InjectDecorator;
export function ForwardArg<T, U>(mapper: Mapper<T, U>): InjectDecorator;
export function ForwardArg(mapper: Mapper = (value): unknown => value): InjectDecorator {
  return createInjectDecorator({ forwardArgumentMapper: mapper });
}

/**
 * Marks the argument as optional
 * @param argument
 */
export function Optional(): InjectDecorator {
  return createInjectDecorator({ optional: true });
}

/**
 * Resolve using ForwardRef to handle circular dependencies. Resolve logic derefs all ForwardRefs which are direct properties of resolved instances automatically
 * @param token token to resolve
 * @param argument resolve argument
 */
export function ForwardRef<T extends object, A>(token?: ForwardRefInjectionToken<T>, argument?: A, options?: Pick<InjectMetadata, 'forwardRefTypeHint'>): InjectDecorator {
  const injectMetadata: InjectMetadata = {
    forwardRef: token ?? true,
    forwardRefTypeHint: options?.forwardRefTypeHint,
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
    mergeData: true,
  });
}
