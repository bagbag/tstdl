import { mapAsync } from '#/utils/async-iterable-helpers/map.js';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array.js';
import { assertDefined, isArray, isNotNull } from '#/utils/type-guards.js';
import { Injector } from './injector.js';
import type { Resolvable, ResolveArgument } from './interfaces.js';
import type { InjectionToken } from './token.js';
import type { ResolveOptions } from './types.js';

export type InjectOptions = ResolveOptions & {
  /** if defined, resolve the ForwardRefToken using ForwardRef strategy instead resolving the token */
  forwardRef?: boolean
};

export type InjectArgumentOptions = {
  optional?: boolean
};

export type InjectionContext = {
  injector: Injector,
  argument: unknown,
  inject<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions): T,
  injectAll<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions): T[],
  injectAsync<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions): Promise<T>,
  injectAllAsync<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions): Promise<T[]>
};

export type InjectManyArrayItem<T, A> = [token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions];
export type InjectManyItem<T, A> = InjectionToken<T, A> | InjectManyArrayItem<T, A>;
export type InjectManyItemReturnType<T extends InjectManyItem<any, any>> = T extends InjectManyItem<infer U, any>
  ? U | (T extends (InjectManyArrayItem<any, any> & [any, any, { optional: true }]) ? undefined : never)
  : never;

export type InjectManyReturnType<T extends InjectManyItem<any, any>[]> = { [I in keyof T]: InjectManyItemReturnType<T[I]> };

let currentInjectionContext: InjectionContext | null = null;

/**
 * Resolves a token using the {@link Injector} of the current injection context
 *
 * @param token token to resolve
 * @param argument argument to resolve token with
 * @param options resolve options
 */
export function inject<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument: ResolveArgument<T, A>, options: InjectOptions & { optional: true }): T | undefined;
export function inject<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions & { optional?: false }): T;
export function inject<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions): T {
  assertInInjectionContext(inject);
  return currentInjectionContext!.inject(token, argument, options);
}

/**
 * Resolves tokens using the {@link Injector} of the current injection context
 *
 * @param token tokens to resolve
 */
export function injectMany<T extends InjectManyItem<any, any>[]>(...tokens: T): InjectManyReturnType<T> {
  assertInInjectionContext(inject);
  return tokens.map((item): any => (isArray(item) ? currentInjectionContext!.inject(item[0], item[1], item[2]) : currentInjectionContext!.inject(item))) as InjectManyReturnType<T>;
}

/**
 * Resolves a token using the {@link Injector} of the current injection context
 *
 * @param token token to resolve
 * @param argument argument to resolve token with
 * @param options resolve options
 */
export async function injectAsync<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument: ResolveArgument<T, A>, options: InjectOptions & { optional: true }): Promise<T | undefined>;
export async function injectAsync<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions): Promise<T>;
export async function injectAsync<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions): Promise<T> {
  assertInInjectionContext(inject);
  return currentInjectionContext!.injectAsync(token, argument, options);
}

/**
 * Resolves tokens using the {@link Injector} of the current injection context
 *
 * @param token tokens to resolve
 */
export async function injectManyAsync<T extends InjectManyItem<any, any>[]>(...tokens: T): Promise<InjectManyReturnType<T>> {
  assertInInjectionContext(inject);

  return toArrayAsync(
    mapAsync(tokens, async (item) => (isArray(item) ? currentInjectionContext!.injectAsync(item[0], item[1], item[2]) : currentInjectionContext!.injectAsync(item)))
  ) as InjectManyReturnType<T>;
}

/**
 * Resolves a token using the {@link Injector} of the current injection context
 *
 * @param token token to resolve
 * @param argument argument to resolve token with
 * @param options resolve options
 */
export function injectAll<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions): T[] {
  assertInInjectionContext(injectAll);
  return currentInjectionContext!.injectAll(token, argument, options);
}

/**
 * Resolves a token using the {@link Injector} of the current injection context
 *
 * @param token token to resolve
 * @param argument argument to resolve token with
 * @param options resolve options
 */
export async function injectAllAsync<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions): Promise<T[]> {
  assertInInjectionContext(injectAll);
  return currentInjectionContext!.injectAllAsync(token, argument, options);
}

/**
 * Injects the resolve argument from the current resolution
 * @param _this can be used for type infer by simply passing `this`. Requires class to implement {@link Resolvable}.
 * @returns
 */
export function injectArgument<T, R>(_this?: Resolvable<T>, options?: InjectArgumentOptions & { optional: R }): T | (R extends true ? undefined : never) {
  assertInInjectionContext(injectArgument);

  const argument = currentInjectionContext!.argument as T | undefined;

  if (options?.optional != true) {
    assertDefined(argument, 'No resolve argument available in current injection context.');
  }

  return argument as T;
}

export function getCurrentInjectionContext(required: true): InjectionContext;
export function getCurrentInjectionContext(required?: boolean): InjectionContext | null;
export function getCurrentInjectionContext(required: boolean = false): InjectionContext | null {
  if (required) {
    assertInInjectionContext(getCurrentInjector);
  }

  return currentInjectionContext;
}

export function getCurrentInjector(required: true): Injector;
export function getCurrentInjector(required?: boolean): Injector | null;
export function getCurrentInjector(required: boolean = false): Injector | null {
  return getCurrentInjectionContext(required)?.injector ?? null;
}

export function setCurrentInjectionContext(context: InjectionContext | null): InjectionContext | null {
  const previous = currentInjectionContext;
  currentInjectionContext = context;

  return previous;
}

/**
 * Runs the given function in the context of the given {@link InjectionContext}.
 *
 * @param context the injection context which will satisfy calls to {@link inject} while `fn` is executing
 * @param fn the closure to be run in the context of `injector`
 * @returns the return value of the function, if any
 */
export function runInInjectionContext<ReturnT>(injectorOrContext: Injector | InjectionContext, fn: () => ReturnT): ReturnT {
  const context: InjectionContext = injectorOrContext instanceof Injector
    ? {
      injector: injectorOrContext,
      argument: undefined,
      inject(token, argument, options) { return injectorOrContext.resolve(token, argument, options); },
      injectAll(token, argument, options) { return injectorOrContext.resolveAll(token, argument, options); },
      async injectAsync(token, argument, options) { return injectorOrContext.resolveAsync(token, argument, options); },
      async injectAllAsync(token, argument, options) { return injectorOrContext.resolveAllAsync(token, argument, options); }
    }
    : injectorOrContext;

  const previousContext = setCurrentInjectionContext(context);

  try {
    return fn();
  }
  finally {
    setCurrentInjectionContext(previousContext);
  }
}

export function isInInjectionContext(): boolean {
  return isNotNull(currentInjectionContext);
}

/**
 * Asserts that the current stack frame is within an injection context and has access to {@link inject}.
 *
 * @param debugFn a reference to the function making the assertion (used for the error message).
 */
export function assertInInjectionContext(debugFn: Function): void {
  if (!isInInjectionContext()) {
    throw new Error(`${debugFn.name}() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with \`runInInjectionContext\``);
  }
}
