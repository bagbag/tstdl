import type { Record, Type } from '#/types.js';
import type { ArgumentedInjectionToken, InjectionTokenArgument, ReifyingInjectionToken } from './token.js';
import type { AfterResolveContext } from './types.js';

export const resolveArgumentType: unique symbol = Symbol('resolveArgumentType');
export const afterResolve: unique symbol = Symbol('after resolve');

export type ResolveArgumentType = typeof resolveArgumentType;

export type ResolveArgument<T, Fallback = undefined> = undefined | (
  T extends Resolvable<infer U> ? U
  : T extends Type<Resolvable<infer U>> ? U
  : T extends (ArgumentedInjectionToken<any, any> | ReifyingInjectionToken) ? InjectionTokenArgument<T>
  : Fallback
);

export interface Resolvable<A = unknown, D extends Record = Record> extends Partial<AfterResolve<A, D>> {
  /**
   * type of resolve argument
   * @deprecated only used for type inference
   */
  readonly [resolveArgumentType]: A;
}

export interface AfterResolve<A = unknown, D extends Record = Record> {
  [afterResolve](argument: A, context: AfterResolveContext<D>): void | Promise<void>;
}
