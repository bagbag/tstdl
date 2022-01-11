/* eslint-disable max-classes-per-file */
import type { Constructor, OneOrMany, Simplify, TypedExtract, TypedOmit } from '#/types';
import { toArray } from '#/utils/array';
import { isDefined } from '#/utils/type-guards';
import type { ForwardRefInjectionToken, Lifecycle, RegistrationOptions } from './container';
import { container, registerTypeInfo, setParameterForwardArgumentMapper, setParameterForwardRefToken, setParameterInjectArgument, setParameterInjectionToken, setParameterOptional } from './container';
import type { ForwardArgumentMapper, InjectionToken, Provider } from './types';

export type InjectableOptions<T, P> = RegistrationOptions<T> & {
  /** aliases (tokens) for the class. Useful for example for circular dependencies when you can't use the class itself as a token */
  alias?: OneOrMany<InjectionToken>,

  /** custom provider. Useful for example if initialization is required */
  provider?: Provider<T, P>
};

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
export function singleton<T extends Constructor = Constructor, P = any>(options: Simplify<TypedOmit<InjectableOptions<T, P>, 'lifecycle'>> = {}): ClassDecorator {
  return injectable({ ...options, lifecycle: 'singleton' });
}

/**
 * registers the class in the global container with scoped lifecycle. Decorated class is not modified in any way
 * @param options registration options
 */
export function scoped<T extends Constructor = Constructor, P = any>(lifecycle: Simplify<TypedExtract<Lifecycle, 'resolution'>>, options: Simplify<TypedOmit<InjectableOptions<T, P>, 'lifecycle'>> = {}): ClassDecorator {
  return injectable({ ...options, lifecycle });
}

/**
 * sets the token used to resolve the parameter
 * @param token token used for resolving
 * @param parameter resolve parameter
 */
export function inject<T, P>(token: InjectionToken<T, P>, parameter?: P): ParameterDecorator {
  function injectDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    setParameterInjectionToken(target as Constructor, parameterIndex, token);

    if (isDefined(parameter)) {
      setParameterInjectArgument(target as Constructor, parameterIndex, parameter);
    }
  }

  return injectDecorator;
}

/**
 * sets the argument used for resolving
 * @param argument
 */
export function injectArg<T>(argument: T): ParameterDecorator {
  function injectArgDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    setParameterInjectArgument(target as Constructor, parameterIndex, argument);
  }

  return injectArgDecorator;
}

/**
 * sets the argument used for resolving the decorated parameter to the the argument provided for parent resolve
 * @param mapper map the argument (for example to select a property instead of passing whole object)
 */
export function forwardArg(): ParameterDecorator;
export function forwardArg<T, U>(mapper: ForwardArgumentMapper<T, U>): ParameterDecorator;
export function forwardArg(mapper: ForwardArgumentMapper = (value) => value): ParameterDecorator {
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
      setParameterInjectArgument(target as Constructor, parameterIndex, argument);
    }
  }

  return injectDecorator;
}
