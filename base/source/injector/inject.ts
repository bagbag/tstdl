import { assertDefined, isNotNull } from '#/utils/type-guards.js';
import type { ResolveManyItem, ResolveManyReturnType } from './injector.js';
import { Injector } from './injector.js';
import type { Resolvable, ResolveArgument } from './interfaces.js';
import type { InjectionToken } from './token.js';
import type { ResolveOptions } from './types.js';

export type InjectOptions<T, A> = ResolveOptions<T, A>;

export type InjectArgumentOptions = {
  optional?: boolean
};

export type InjectionContext = {
  injector: Injector,
  argument: unknown,
  inject<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions<T, A>): T,
  injectAll<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions<T, A>): T[],
  injectMany<T extends InjectManyItem<any, any>[]>(...tokens: T): InjectManyReturnType<T>,
  injectAsync<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions<T, A>): Promise<T>,
  injectAllAsync<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions<T, A>): Promise<T[]>,
  injectManyAsync<T extends InjectManyItem<any, any>[]>(...tokens: T): Promise<InjectManyReturnType<T>>
};

export type InjectManyItem<T, A> = ResolveManyItem<T, A>;
export type InjectManyReturnType<T extends InjectManyItem<any, any>[]> = ResolveManyReturnType<T>;

let currentInjectionContext: InjectionContext | null = null;

/**
 * Resolves a token using the {@link Injector} of the current injection context
 *
 * @param token token to resolve
 * @param argument argument to resolve token with
 * @param options resolve options
 */
export function inject<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument: ResolveArgument<T, A>, options: InjectOptions<T, A> & { optional: true }): T | undefined;
export function inject<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions<T, A> & { optional?: false }): T;
export function inject<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions<T, A>): T {
  return getCurrentInjectionContext(inject, true).inject(token, argument, options);
}

/**
 * Resolves tokens using the {@link Injector} of the current injection context
 *
 * @param token tokens to resolve
 */
export function injectMany<T extends InjectManyItem<any, any>[]>(...tokens: T): InjectManyReturnType<T> {
  return getCurrentInjectionContext(injectMany, true).injectMany(...tokens);
}

/**
 * Resolves a token using the {@link Injector} of the current injection context
 *
 * @param token token to resolve
 * @param argument argument to resolve token with
 * @param options resolve options
 */
export async function injectAsync<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument: ResolveArgument<T, A>, options: InjectOptions<T, A> & { optional: true }): Promise<T | undefined>;
export async function injectAsync<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions<T, A>): Promise<T>;
export async function injectAsync<T = unknown, A = unknown>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions<T, A>): Promise<T> {
  return getCurrentInjectionContext(injectAsync, true).injectAsync(token, argument, options);
}

/**
 * Resolves tokens using the {@link Injector} of the current injection context
 *
 * @param token tokens to resolve
 */
export async function injectManyAsync<T extends InjectManyItem<any, any>[]>(...tokens: T): Promise<InjectManyReturnType<T>> {
  return getCurrentInjectionContext(injectManyAsync, true).injectManyAsync(...tokens);
}

/**
 * Resolves a token using the {@link Injector} of the current injection context
 *
 * @param token token to resolve
 * @param argument argument to resolve token with
 * @param options resolve options
 */
export function injectAll<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions<T, A>): T[] {
  return getCurrentInjectionContext(injectAll, true).injectAll(token, argument, options);
}

/**
 * Resolves a token using the {@link Injector} of the current injection context
 *
 * @param token token to resolve
 * @param argument argument to resolve token with
 * @param options resolve options
 */
export async function injectAllAsync<T, A>(token: InjectionToken<T, A>, argument?: ResolveArgument<T, A>, options?: InjectOptions<T, A>): Promise<T[]> {
  return getCurrentInjectionContext(injectAllAsync, true).injectAllAsync(token, argument, options);
}

/**
 * Injects the resolve argument from the current resolution
 * @param _this can be used for type infer by simply passing `this`. Requires class to implement {@link Resolvable}.
 * @returns
 */
export function injectArgument<T, R>(_this?: Resolvable<T>, options?: InjectArgumentOptions & { optional: R }): T | (R extends true ? undefined : never) {
  const argument = getCurrentInjectionContext(injectArgument, true).argument as T | undefined;

  if (options?.optional != true) {
    assertDefined(argument, 'No resolve argument available in current injection context.');
  }

  return argument as T;
}

export function getCurrentInjectionContext(debugFn: Function, required: true): InjectionContext;
export function getCurrentInjectionContext(debugFn: Function, required?: boolean): InjectionContext | null;
export function getCurrentInjectionContext(debugFn: Function, required: boolean = false): InjectionContext | null {
  if (required) {
    assertInInjectionContext(debugFn);
  }

  return currentInjectionContext;
}

export function getCurrentInjector(required: true): Injector;
export function getCurrentInjector(required?: boolean): Injector | null;
export function getCurrentInjector(required: boolean = false): Injector | null {
  return getCurrentInjectionContext(getCurrentInjector, required)?.injector ?? null;
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
      injectMany(...tokens) { return injectorOrContext.resolveMany(...tokens); },
      async injectAsync(token, argument, options) { return injectorOrContext.resolveAsync(token, argument, options); },
      async injectAllAsync(token, argument, options) { return injectorOrContext.resolveAllAsync(token, argument, options); },
      async injectManyAsync(...tokens) { return injectorOrContext.resolveManyAsync(...tokens); },
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
