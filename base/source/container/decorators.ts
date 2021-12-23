/* eslint-disable max-classes-per-file */
import type { Constructor, OneOrMany, Simplify, TypedExtract, TypedOmit } from '#/types';
import { toArray } from '#/utils/array';
import { isDefined } from '#/utils/type-guards';
import type { ForwardRefInjectionToken, Lifecycle, RegistrationOptions } from './container';
import { container, setParameterForwardRefToken, setParameterInjectionToken, setParameterInjectArgument, registerTypeInfo } from './container';
import type { InjectionToken } from './types';

export type InjectableOptions<T> = RegistrationOptions<T> & {
  /** aliases (tokens) for the class. Useful for example for circular dependencies when you can't use the class itself as a token */
  alias?: OneOrMany<InjectionToken>
};

/**
 * registers the class in the global container. Decorated class is not modified in any way
 * @param options registration options
 */
export function injectable<T = any>(options: InjectableOptions<T> = {}): ClassDecorator {
  function injectableDecorator<U extends Constructor>(target: U): U {
    registerTypeInfo(target);

    const { alias: aliases, ...registrationOptions } = options;

    container.register(target, { useClass: target }, registrationOptions);

    if (isDefined(aliases)) {
      for (const alias of toArray(aliases)) {
        container.register(alias, { useToken: target }, registrationOptions);
      }
    }

    return target;
  }

  return injectableDecorator as ClassDecorator;
}

/**
 * registers the class in the global container with singleton lifecycle. Decorated class is not modified in any way
 * @param options registration options
 */
export function singleton<T>(options: Simplify<TypedOmit<InjectableOptions<T>, 'lifecycle'>> = {}): ClassDecorator {
  return injectable({ ...options, lifecycle: 'singleton' });
}

/**
 * registers the class in the global container with scoped lifecycle. Decorated class is not modified in any way
 * @param options registration options
 */
export function scoped<T>(lifecycle: Simplify<TypedExtract<Lifecycle, 'resolution'>>, options: Simplify<TypedOmit<InjectableOptions<T>, 'lifecycle'>> = {}): ClassDecorator {
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
export function injectArg<P>(argument: P): ParameterDecorator {
  function injectArgDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    setParameterInjectArgument(target as Constructor, parameterIndex, argument);
  }

  return injectArgDecorator;
}

/**
 * resolve the parameter using ForwardRef to handle circular dependencies
 * @param token token to resolve
 * @param argument resolve argument
 */
export function forwardRef<T, P>(token: ForwardRefInjectionToken<T>, argument?: P): ParameterDecorator {
  function injectDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    setParameterForwardRefToken(target as Constructor, parameterIndex, token);

    if (isDefined(argument)) {
      setParameterInjectArgument(target as Constructor, parameterIndex, argument);
    }
  }

  return injectDecorator;
}
