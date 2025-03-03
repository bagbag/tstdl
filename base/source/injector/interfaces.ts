import type { Record, Type } from '#/types.js';
import type { ArgumentedInjectionToken, InjectionTokenArgument, ReifyingInjectionToken } from './token.js';
import type { AfterResolveContext } from './types.js';

export const resolveArgumentType = Symbol('resolveArgumentType');
export const afterResolve = Symbol('afterResolve');

export type ResolveArgumentType = typeof resolveArgumentType;

export type ResolveArgument<T, Fallback = undefined> = undefined | (
  T extends Resolvable<infer U> ? (U | undefined)
  : T extends Type<Resolvable<infer U>> ? (U | undefined)
  : T extends (ArgumentedInjectionToken<any, any> | ReifyingInjectionToken) ? InjectionTokenArgument<T>
  : Fallback
);

export interface Resolvable<A = unknown, D extends Record = Record> extends Partial<AfterResolve<A, D>> {

  /**
   * Type of resolve argument
   * @deprecated only used for type inference
   */
  readonly [resolveArgumentType]?: A;
}

export interface AfterResolve<A = unknown, D extends Record = Record> {
  [afterResolve](argument: NoInfer<A>, context: AfterResolveContext<NoInfer<D>>): void | Promise<void>;
}
