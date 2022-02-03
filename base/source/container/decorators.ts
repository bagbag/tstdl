/* eslint-disable max-classes-per-file */
import type { Constructor, OneOrMany, Simplify, TypedExtract, TypedOmit } from '#/types';
import { toArray } from '#/utils/array';
import { isDefined, isFunction } from '#/utils/type-guards';
import type { ArgumentProvider, ForwardRefInjectionToken, Lifecycle, Mapper, RegistrationOptions } from './container';
import { container, registerTypeInfo, setParameterForwardArgumentMapper, setParameterForwardRefToken, setParameterInjectArgumentMapper, setParameterInjectionToken, setParameterMapper, setParameterOptional, setParameterResolveArgumentProvider } from './container';
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
  function injectableDecorator<U extends T>(target: Constructor<U>): void {
    const { alias: aliases, provider, ...registrationOptions } = options;

    registerTypeInfo(target);

    const targetProvider: Provider = provider ?? { useClass: target };
    container.register(target, targetProvider, registrationOptions);

    if (isDefined(aliases)) {
      for (const alias of toArray(aliases)) {
        container.register(alias, { useToken: target }, registrationOptions);
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
export function inject<T, A>(token: InjectionToken<T, A>, argument?: A, mapperOrKey?: Mapper<T> | keyof T): ParameterDecorator {
  function injectDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    setParameterInjectionToken(target as Constructor, parameterIndex, token);

    if (isDefined(argument)) {
      setParameterResolveArgumentProvider(target as Constructor, parameterIndex, () => argument);
    }

    if (isDefined(mapperOrKey)) {
      const mapperFunction: Mapper = isFunction(mapperOrKey) ? mapperOrKey : ((value: any) => (value as Record<any, unknown>)[mapperOrKey]);
      setParameterMapper(target as Constructor, parameterIndex, mapperFunction);
    }
  }

  return injectDecorator;
}

/**
 * sets the argument used for resolving the parameter
 * @param argument
 */
export function resolveArg<T>(argument: T): ParameterDecorator {
  function resolveArgDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    setParameterResolveArgumentProvider(target as Constructor, parameterIndex, () => argument);
  }

  return resolveArgDecorator;
}

/**
 * sets the argument provider used for resolving the parameter
 * @param argumentProvider
 */
export function resolveArgProvider<T>(argumentProvider: ArgumentProvider<T>): ParameterDecorator {
  function resolveArgDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    setParameterResolveArgumentProvider(target as Constructor, parameterIndex, argumentProvider);
  }

  return resolveArgDecorator;
}

/**
 * injects the argument used for resolving the class
 * @param argument
 * @param mapperOrKey map the resolved value. If {@link PropertyKey} is provided, that property of the resolved value will be injected
 */
export function injectArg<T>(mapperOrKey?: Mapper<T> | keyof T): ParameterDecorator {
  function injectArgDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    const mapperFunction: Mapper = isFunction(mapperOrKey) ? mapperOrKey : ((value: any) => (value as Record<any, unknown>)[mapperOrKey]);
    setParameterInjectArgumentMapper(target as Constructor, parameterIndex, mapperFunction);
  }

  return injectArgDecorator;
}

/**
 * sets the argument used for resolving the decorated parameter to the the argument provided for parent resolve
 * @param mapper map the argument (for example to select a property instead of forwarding the whole object)
 */
export function forwardArg(): ParameterDecorator;
export function forwardArg<T, U>(mapper: Mapper<T, U>): ParameterDecorator;
export function forwardArg(mapper: Mapper = (value) => value): ParameterDecorator {
  function forwardArgDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    setParameterForwardArgumentMapper(target as Constructor, parameterIndex, mapper);
  }

  return forwardArgDecorator;
}

/**
 * marks the argument as optional
 * @param argument
 */
export function optional(): ParameterDecorator {
  function optionalDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    setParameterOptional(target as Constructor, parameterIndex);
  }

  return optionalDecorator;
}

/**
 * resolve the parameter using ForwardRef to handle circular dependencies
 * @param token token to resolve
 * @param argument resolve argument
 */
export function forwardRef<T, A>(token: ForwardRefInjectionToken<T>, argument?: A): ParameterDecorator {
  function injectDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    setParameterForwardRefToken(target as Constructor, parameterIndex, token);

    if (isDefined(argument)) {
      setParameterResolveArgumentProvider(target as Constructor, parameterIndex, () => argument);
    }
  }

  return injectDecorator;
}
