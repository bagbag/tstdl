/* eslint-disable max-classes-per-file */
import type { Constructor, OneOrMany, Simplify, TypedOmit } from '#/types';
import { isDefined, toArray } from '#/utils';
import type { ForwardRefInjectionToken, RegistrationOptions } from './container';
import { container, defineParameterForwarded, defineParameterInjectionToken, setTypeInfo } from './container';
import type { InjectionToken } from './types';

export type InjectableOptions<T> = RegistrationOptions<T> & {
  alias?: OneOrMany<InjectionToken>
};

export function injectable<T = any>(options: InjectableOptions<T> = {}): ClassDecorator {
  function injectableDecorator<U extends Function>(target: U): U {
    setTypeInfo(target as unknown as Constructor);

    const { alias: aliases, ...registrationOptions } = options;

    container.register(target as unknown as Constructor, { useClass: target as unknown as Constructor }, registrationOptions);

    if (isDefined(aliases)) {
      for (const alias of toArray(aliases)) {
        container.register(alias, { useToken: target as unknown as Constructor }, registrationOptions);
      }
    }

    return target;
  }

  return injectableDecorator;
}

export function singleton<T>(options: Simplify<TypedOmit<InjectableOptions<T>, 'lifecycle'>> = {}): ClassDecorator {
  return injectable({ ...options, lifecycle: 'singleton' });
}

export function inject<T>(token: InjectionToken<T>): ParameterDecorator {
  function injectDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    defineParameterInjectionToken(target as Constructor, parameterIndex, token);
  }

  return injectDecorator;
}

export function forwardRef<T>(token: ForwardRefInjectionToken<T>): ParameterDecorator {
  function injectDecorator(target: object, _propertyKey: string | symbol, parameterIndex: number): void {
    defineParameterForwarded(target as Constructor, parameterIndex, token);
  }

  return injectDecorator;
}
