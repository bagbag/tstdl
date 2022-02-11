export declare const resolveArgumentType: unique symbol;
export const afterResolve: unique symbol = Symbol('after resolve');

export type InjectableArgument<T, Fallback> = T extends Injectable<infer A> ? A : Fallback;

export interface Injectable<T = unknown> {
  /**
   * type of resolve argument
   * @deprecated only used for type inference
   */
  readonly [resolveArgumentType]: T;
}

export interface AfterResolve {
  /**
   * called after resolve through container
   */
  [afterResolve](): void | Promise<void>;
}
