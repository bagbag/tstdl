import type { Constructor } from '#/types';
import { isFunction, isString } from '#/utils/type-guards';

declare const parameter: unique symbol;

export type ParameterizedInjectionToken<T, A> = SimpleInjectionToken<T> & { [parameter]?: A };

export type SimpleInjectionToken<T> = Constructor<T> | Function | object | string | symbol;

export type InjectionToken<T = any, A = any> = SimpleInjectionToken<T> | ParameterizedInjectionToken<T, A>;

export function injectionToken<T, A = any>(token: InjectionToken<T, A>): InjectionToken<T, A> {
  return token;
}

export function getTokenName(token: InjectionToken | undefined): string {
  return isFunction(token)
    ? token.name
    : isString(token)
      ? `"${token}"`
      : String(token);
}
