import type { AbstractConstructor } from '#/types/index.js';
import { isFunction } from '#/utils/type-guards.js';

declare const type: unique symbol;
declare const argument: unique symbol;

export type SimpleInjectionToken<T> = AbstractConstructor<T>;

export type ArgumentedInjectionToken<T, A> = SimpleInjectionToken<T> & { [argument]: A };

export type InjectionToken<T = any, A = any> = SimpleInjectionToken<T> | ArgumentedInjectionToken<T, A> | ReifyingInjectionToken<T, A>;

export type InjectionTokenArgument<T extends ArgumentedInjectionToken<any, any> | ReifyingInjectionToken> = T[typeof argument];

export class ReifyingInjectionToken<T = any, A = any> {
  /**
   * @deprecated for internal typing
   */
  declare readonly [type]: T;

  /**
   * @deprecated for internal typing
   */
  declare readonly [argument]: A;

  readonly description: string;

  constructor(description: string) {
    this.description = description;
  }

  toString(): string {
    return `InjectionToken["${this.description}"]`;
  }
}

/**
 * Creates a new injection token.
 *
 * @template T The type that will be provided by the token.
 * @template A Optional type for additional arguments.
 * @param description A string describing the purpose of the injection token.
 */
export function injectionToken<T, A = never>(description: string): InjectionToken<T, A> {
  return new ReifyingInjectionToken<T, A>(description);
}

export function getTokenName(token: InjectionToken | undefined): string {
  return isFunction(token)
    ? token.name
    : token instanceof ReifyingInjectionToken
      ? token.toString()
      : String(token);
}
