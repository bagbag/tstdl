import type { AbstractConstructor, EnumerationObject } from '#/types.js';
import { isFunction, isString } from '#/utils/type-guards.js';

declare const type: unique symbol;
declare const argument: unique symbol;

export type ArgumentedInjectionToken<T, A> = SimpleInjectionToken<T> & { [argument]?: A };

export type SimpleInjectionToken<T> = AbstractConstructor<T> | EnumerationObject;

export type InjectionToken<T = any, A = any> = SimpleInjectionToken<T> | ArgumentedInjectionToken<T, A> | ReifyingInjectionToken<T, A>;

export class ReifyingInjectionToken<T = any, A = any> {
  declare private readonly [type]: T;
  declare private readonly [argument]: A;

  readonly description: string;

  constructor(description: string) {
    this.description = description;
  }

  toString(): string {
    return `InjectionToken["${this.description}"]`;
  }
}

export function injectionToken<T, A = any>(description: string): InjectionToken<T, A> {
  return new ReifyingInjectionToken<T, A>(description);
}

export function getTokenName(token: InjectionToken | undefined): string {
  return isFunction(token)
    ? token.name
    : isString(token)
      ? `"${token}"`
      : String(token);
}
