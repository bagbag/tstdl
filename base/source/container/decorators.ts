/* eslint-disable @typescript-eslint/ban-types */
import type { Constructor, OneOrMany, Simplify, TypedExtract, TypedOmit } from '#/types';
import { toArray } from '#/utils/array';
import { getDesignType, getParameterTypes } from '#/utils/reflection';
import { isDefined, isFunction } from '#/utils/type-guards';
import type { ArgumentProvider, ForwardRefInjectionToken, Lifecycle, Mapper, RegistrationOptions } from './container';
import { container, getInjectMetadata } from './container';
import type { InjectionToken, Provider } from './types';

export type InjectableOptions<T, P> = RegistrationOptions<T> & {
  /** aliases (tokens) for the class. Useful for example for circular dependencies when you can't use the class itself as a token */
  alias?: OneOrMany<InjectionToken>,

  /** custom provider. Useful for example if initialization is required */
  provider?: Provider<T, P>
};

/**
 * helper decorator to replace a class definition with an other
 * can be used for example to type external classes with the {@link Injectable} interface
 * @param constructor class to replace with
 */
export function replaceClass<T>(constructor: Constructor<T>): ClassDecorator {
  function replaceDecorator(_target: Constructor<T>): Constructor<T> {
    return constructor;
  }

  return replaceDecorator as ClassDecorator;
}

/**
 * registers the class in the global container. Decorated class is not modified in any way
 * @param options registration options
 */
export function injectable<T = any, P = any>(options: InjectableOptions<T, P> = {}): ClassDecorator {
  function injectableDecorator<U extends T>(constructor: Constructor<U>): void {
    const { alias: aliases, provider, ...registrationOptions } = options;

    const parameterTypes = getParameterTypes(constructor) ?? [];

    for (let i = 0; i < parameterTypes.length; i++) {
      const metadata = getInjectMetadata(constructor, undefined, i, true);
      metadata.token = parameterTypes[i] as InjectionToken;
    }

    const targetProvider: Provider = provider ?? { useClass: constructor };
    container.register(constructor, targetProvider, registrationOptions);

    if (isDefined(aliases)) {
      for (const alias of toArray(aliases)) {
        container.register(alias, { useToken: constructor }, registrationOptions);
      }
    }
  }

  return injectableDecorator as ClassDecorator;
}

/**
 * registers the class in the global container with singleton lifecycle. Decorated class is not modified in any way
 * @param options registration options
 */
export function singleton<T = any, P = any>(options: Simplify<TypedOmit<InjectableOptions<T, P>, 'lifecycle'>> = {}): ClassDecorator {
  return injectable({ ...options, lifecycle: 'singleton' });
}

/**
 * registers the class in the global container with scoped lifecycle. Decorated class is not modified in any way
 * @param options registration options
 */
export function scoped<T = any, P = any>(lifecycle: Simplify<TypedExtract<Lifecycle, 'resolution'>>, options: Simplify<TypedOmit<InjectableOptions<T, P>, 'lifecycle'>> = {}): ClassDecorator {
  return injectable({ ...options, lifecycle });
}

/**
 * sets the token used to resolve the parameter
 * @param token token used for resolving
 * @param argument resolve argument
 * @param mapperOrKey map the resolved value. If {@link PropertyKey} is provided, that property of the resolved value will be injected
 */
export function inject<T, A>(token?: InjectionToken<T, A>, argument?: A, mapperOrKey?: Mapper<T> | keyof T): PropertyDecorator & ParameterDecorator {
  function injectDecorator(target: object, propertyKey: string | symbol, parameterIndex?: number): void {
    const metadata = getInjectMetadata(target, propertyKey, parameterIndex, true);

    if (metadata.type == 'property') {
      metadata.token = getDesignType(target, propertyKey) as InjectionToken;
    }

    if (isDefined(token)) {
      metadata.injectToken = token;
    }

    if (isDefined(argument)) {
      metadata.resolveArgumentProvider = () => argument;
    }

    if (isDefined(mapperOrKey)) {
      metadata.mapper = isFunction(mapperOrKey) ? mapperOrKey : ((value: any) => (value as Record<any, unknown>)[mapperOrKey]);
    }
  }

  return injectDecorator;
}

/**
 * sets the argument used for resolving the parameter
 * @param argument
 */
export function resolveArg<T>(argument: T): PropertyDecorator & ParameterDecorator {
  function resolveArgDecorator(target: object, propertyKey: string | symbol, parameterIndex?: number): void {
    const metadata = getInjectMetadata(target, propertyKey, parameterIndex, true);
    metadata.resolveArgumentProvider = () => argument;
  }

  return resolveArgDecorator;
}

/**
 * sets the argument provider used for resolving the parameter
 * @param argumentProvider
 */
export function resolveArgProvider<T>(argumentProvider: ArgumentProvider<T>): PropertyDecorator & ParameterDecorator {
  function resolveArgDecorator(target: object, propertyKey: string | symbol, parameterIndex?: number): void {
    const metadata = getInjectMetadata(target, propertyKey, parameterIndex, true);
    metadata.resolveArgumentProvider = argumentProvider;
  }

  return resolveArgDecorator;
}

/**
 * injects the argument used for resolving the class instead of resolving the parameter
 * @param argument
 * @param mapperOrKey map the resolved value. If {@link PropertyKey} is provided, that property of the resolved value will be injected
 */
export function injectArg<T>(mapperOrKey?: Mapper<T> | keyof T): PropertyDecorator & ParameterDecorator {
  function injectArgDecorator(target: object, propertyKey: string | symbol, parameterIndex?: number): void {
    const metadata = getInjectMetadata(target, propertyKey, parameterIndex, true);
    metadata.injectArgumentMapper = isFunction(mapperOrKey)
      ? mapperOrKey
      : isDefined(mapperOrKey)
        ? ((value: T) => (value as Record<any, unknown>)[mapperOrKey])
        : (value: T) => value;
  }

  return injectArgDecorator;
}

/**
 * sets the argument used for resolving the decorated parameter to the the argument provided for parent resolve
 * @param mapper map the argument (for example to select a property instead of forwarding the whole object)
 */
export function forwardArg(): PropertyDecorator & ParameterDecorator;
export function forwardArg<T, U>(mapper: Mapper<T, U>): PropertyDecorator & ParameterDecorator;
export function forwardArg(mapper: Mapper = (value): unknown => value): PropertyDecorator & ParameterDecorator {
  function forwardArgDecorator(target: object, propertyKey: string | symbol, parameterIndex?: number): void {
    const metadata = getInjectMetadata(target, propertyKey, parameterIndex, true);
    metadata.forwardArgumentMapper = mapper;
  }

  return forwardArgDecorator;
}

/**
 * marks the argument as optional
 * @param argument
 */
export function optional(): PropertyDecorator & ParameterDecorator {
  function optionalDecorator(target: object, propertyKey: string | symbol, parameterIndex?: number): void {
    const metadata = getInjectMetadata(target, propertyKey, parameterIndex, true);
    metadata.optional = true;
  }

  return optionalDecorator;
}

/**
 * resolve using ForwardRef to handle circular dependencies. Resolve logic derefs all ForwardRefs which are direct properties of resolved instances automatically
 * @param token token to resolve
 * @param argument resolve argument
 */
export function forwardRef<T, A>(token: ForwardRefInjectionToken<T>, argument?: A): PropertyDecorator & ParameterDecorator {
  function injectDecorator(target: object, propertyKey: string | symbol, parameterIndex?: number): void {
    const metadata = getInjectMetadata(target, propertyKey, parameterIndex, true);
    metadata.forwardRefToken = token;

    if (isDefined(argument)) {
      metadata.resolveArgumentProvider = () => argument;
    }
  }

  return injectDecorator;
}
