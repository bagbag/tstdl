/**
 * Represents the public interface for an asynchronous hook.
 *
 * @template T The type of the value that the hook is triggered with.
 * @template C The type of the optional context object passed to the hook's trigger and handlers. Defaults to `never`.
 * @template R The return type of an individual handler. Defaults to `unknown`.
 */
export type AsyncHook<T, C = never, R = unknown> = {
  /**
   * Registers a handler function to be called when the hook is triggered.
   * @param handler The async handler function to register.
   * @returns A registration object with an `unregister` method to remove the handler.
   */
  register: (handler: AsyncHookHandler<T, C, R>) => AsyncHookHandlerRegistration,

  /**
   * Triggers the hook, executing all registered handlers in sequence.
   *
   * The signature of this function is conditional:
   * - If the context type `C` is `never` (the default), it accepts only the `value` argument.
   * - If `C` is any other type, it requires both `value` and `context` arguments.
   *
   * @param value The value to pass to all handlers.
   * @param context The context object to pass to all handlers (only required if `C` is not `never`).
   * @returns A promise that resolves to an array of results from all handlers.
   */
  trigger: [C] extends [never] ? ((value: T) => Promise<R[]>) : ((value: T, context: C) => Promise<R[]>),
};

/**
 * Defines the signature for a handler function that can be registered with an `AsyncHook`.
 * The function can be synchronous (returning `R`) or asynchronous (returning `Promise<R>`).
 *
 * The signature is conditional based on the context type `C`:
 * - If `C` is `never`, the handler receives only the `value` argument.
 * - If `C` is any other type, the handler receives both `value` and `context`.
 *
 * @template T The type of the value passed to the handler.
 * @template C The type of the optional context object.
 * @template R The expected return type of the handler.
 */
export type AsyncHookHandler<T, C, R> = [C] extends [never] ? ((value: T) => R | Promise<R>) : ((value: T, context: C) => R | Promise<R>);

/**
 * Represents the object returned when a handler is registered,
 * allowing for its subsequent unregistration.
 */
export type AsyncHookHandlerRegistration = {
  /**
   * Unregisters the handler, preventing it from being called in future triggers.
   */
  unregister: () => void,
};

/**
 * Creates a new asynchronous hook.
 *
 * An async hook is a system that allows you to register multiple "handler" functions
 * that will be executed in sequence when a "trigger" event occurs. This is useful
 * for creating extensible, plugin-like architectures. Handlers can be synchronous
 * or asynchronous.
 *
 * @template T The type of the primary value that the hook is triggered with.
 * @template C The type of the optional context object passed to the hook's trigger and handlers. Defaults to `never`.
 * @template R The return type of an individual handler. The `trigger` method will resolve with an array of these values (`R[]`). Defaults to `unknown`.
 * @returns {AsyncHook<T, C, R>} An object with `register` and `trigger` methods.
 *
 * @example
 * ```ts
 * // Simple hook without context
 * async function runSimpleExample() {
 *   const onTaskStart = asyncHook<string>();
 *
 *   onTaskStart.register(taskName => {
 *     console.log(`[Logger] Task started: ${taskName}`);
 *   });
 *
 *   const registration = onTaskStart.register(async taskName => {
 *     await new Promise(resolve => setTimeout(resolve, 50));
 *     console.log(`[Notifier] Notifying that task started: ${taskName}`);
 *   });
 *
 *   await onTaskStart.trigger('Process Data');
 *   // [Logger] Task started: Process Data
 *   // [Notifier] Notifying that task started: Process Data
 *
 *   registration.unregister();
 *   console.log('Notifier unregistered.');
 *
 *   await onTaskStart.trigger('Finalize Report');
 *   // [Logger] Task started: Finalize Report
 * }
 * ```
 *
 * @example
 * ```ts
 * // Hook with a context object
 * async function runContextExample() {
 *   type TaskContext = { userId: number; transactionId: string };
 *
 *   const onTaskComplete = asyncHook<string, TaskContext, boolean>();
 *
 *   onTaskComplete.register((taskName, context) => {
 *     console.log(`[Audit] Task '${taskName}' completed by user ${context.userId}.`);
 *     return true; // Audit successful
 *   });
 *
 *   onTaskComplete.register(async (taskName, context) => {
 *     console.log(`[DB] Logging completion of '${taskName}' for transaction ${context.transactionId}.`);
 *     return true; // DB update successful
 *   });
 *
 *   const results = await onTaskComplete.trigger(
 *     'SubmitOrder',
 *     { userId: 123, transactionId: 'abc-456' }
 *   );
 *
 *   console.log('Handler results:', results); // [true, true]
 * }
 * ```
 */
export function asyncHook<T, C = never, R = unknown>(): AsyncHook<T, C, R> {
  const handlers: AsyncHookHandler<T, C, R>[] = [];

  return {
    register: (handler: AsyncHookHandler<T, C, R>): AsyncHookHandlerRegistration => {
      handlers.push(handler);

      return {
        unregister() {
          const index = handlers.indexOf(handler);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        },
      };
    },
    // The implementation uses a single function body, but the public type signature
    // is conditional, ensuring type safety for callers.
    trigger: async (value: T, context?: C) => {
      const returnValues: R[] = [];

      // Create a snapshot of handlers in case one of them unregisters another during its execution.
      for (const handler of [...handlers]) {
        // The non-null assertion `context!` is safe due to the conditional public type of `trigger`.
        const returnValue = await handler(value, context!);
        returnValues.push(returnValue);
      }

      return returnValues;
    },
  };
}
