import type { Type } from '#/types.js';
import type { InjectionToken } from './token.js';

export const resolveArgumentType: unique symbol = Symbol('resolveArgumentType');
export const afterResolve: unique symbol = Symbol('after resolve');

export type ResolveArgumentType = typeof resolveArgumentType;

export type ResolveArgument<T, Fallback = undefined> = (
  T extends Resolvable<infer U> ? U
  : T extends Type<Resolvable<infer U>> ? U
  : T extends InjectionToken<infer U, infer A> ? ResolveArgument<U, A>
  : Fallback) | undefined;

export interface Resolvable<A = unknown> {

  /**
   * type of resolve argument
   * @deprecated only used for type inference
   */
  readonly [resolveArgumentType]: A;

  [afterResolve]?(argument: A): void | Promise<void>;
}
