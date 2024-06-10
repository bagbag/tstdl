import type { SimplifyObject } from '#/types.js';
import { isNotNull } from '#/utils/type-guards.js';

/**
 * Creates a new context provider
 * @param name name of of the context used for function names
 */
export function createContextProvider<Context, const Name extends string>(name: Name) { // eslint-disable-line @typescript-eslint/explicit-function-return-type
  let currentContext: Context | null = null;

  /**
   * Get the current context
   * @param debugFn a reference to the function making the call (used for the error message).
   * @param required if a context is required. If true, throws if no context is available
   */
  function getCurrentContext(required: true, debugFn: Function): Context;
  function getCurrentContext(required?: false | undefined, debugFn?: Function): Context | null;
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
  function assertInContext(debugFn: Function): void {
    if (!isInContext()) {
      throw new Error(`${debugFn.name}() can only be used within an ${name}Context via \`runIn${name}Context\`.`);
    }
  }

  return {
    [`getCurrent${name}Context`]: getCurrentContext,
    [`setCurrent${name}Context`]: setCurrentContext,
    [`runIn${name}Context`]: runInContext,
    [`isIn${name}Context`]: getCurrentContext,
    [`assertIn${name}Context`]: getCurrentContext
  } as SimplifyObject<
    { [P in `getCurrent${Name}Context`]: typeof getCurrentContext }
    & { [P in `setCurrent${Name}Context`]: typeof setCurrentContext }
    & { [P in `runIn${Name}Context`]: typeof runInContext }
    & { [P in `isIn${Name}Context`]: typeof getCurrentContext }
    & { [P in `assertIn${Name}Context`]: typeof getCurrentContext }
  >;
}
