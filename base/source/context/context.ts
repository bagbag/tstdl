import type { Function, SimplifyObject } from '#/types/index.js';
import { isNotNull, isString } from '#/utils/type-guards.js';

/**
 * Creates a new context provider
 * @param name name of of the context used for function names
 */
export function createContextProvider<Context, const Name extends string>(name: Name) {
  let currentContext: Context | null = null;

  /**
   * Get the current context
   * @param debugFn a reference to the function making the call (used for the error message).
   * @param required if a context is required. If true, throws if no context is available
   */
  function getCurrentContext(required: true, debugFn: Function): Context;
  function getCurrentContext(required?: false, debugFn?: Function): Context | null;
  function getCurrentContext(required: boolean, debugFn: Function): Context | null;
  function getCurrentContext(required: boolean = false, debugFn?: Function): Context | null {
    if (required) {
      assertInContext(debugFn!);
    }

    return currentContext;
  }

  /**
   * Manually set the context. Usually runInContext is preferred, as no manual cleanup is required.
   * @param context context to set
   * @returns previous context, if any
   */
  function setCurrentContext(context: Context | null): Context | null {
    const previous = currentContext;
    currentContext = context;

    return previous;
  }

  /**
   * Runs the given function with the given {@link Context} as context.
   *
   * @param context the context to provide while `fn` is executing
   * @param fn the function to run with the provided context
   * @returns the return value of the function, if any
   */
  function runInContext<ReturnT>(context: Context, fn: () => ReturnT): ReturnT {
    const previousContext = setCurrentContext(context);

    try {
      return fn();
    }
    finally {
      setCurrentContext(previousContext);
    }
  }

  /**
   * Whether the current stack is in a context
   */
  function isInContext(): boolean {
    return isNotNull(currentContext);
  }

  /**
   * Asserts that the current stack is within an context
   *
   * @param debugFn a reference to the function making the assertion (used for the error message).
   */
  function assertInContext(debugFnOrMessage: Function | string): void {
    if (!isInContext()) {
      const message = isString(debugFnOrMessage)
        ? debugFnOrMessage
        : `${debugFnOrMessage.name}() can only be used within an ${name}Context via \`runIn${name}Context\`.`;

      throw new Error(message);
    }
  }

  return {
    [`getCurrent${name}Context`](...args: Parameters<typeof getCurrentContext>) { return getCurrentContext(...args); },
    [`setCurrent${name}Context`](...args: Parameters<typeof setCurrentContext>) { return setCurrentContext(...args); },
    [`runIn${name}Context`](...args: Parameters<typeof runInContext>) { return runInContext(...args); },
    [`isIn${name}Context`](...args: Parameters<typeof isInContext>) { return isInContext(...args); },
    [`assertIn${name}Context`](...args: Parameters<typeof assertInContext>) { assertInContext(...args); },
  } as SimplifyObject<
    Record<`getCurrent${Name}Context`, typeof getCurrentContext>
    & Record<`setCurrent${Name}Context`, typeof setCurrentContext>
    & Record<`runIn${Name}Context`, typeof runInContext>
    & Record<`isIn${Name}Context`, typeof isInContext>
    & Record<`assertIn${Name}Context`, typeof assertInContext>
  >;
}
