import { isFunction } from '../type-guards.js';

export type ReadableStreamFinalizeEvent =
  | { type: 'done' }
  | { type: 'error', error: any }
  | { type: 'cancel', reason: any };

/**
 * Finalizer is called *after* the specific event occurred.
 */
export type StreamFinalizerHandler = (event: ReadableStreamFinalizeEvent) => void | Promise<void>;

export type FinalizeStreamHandlers = {
  finalizer?: StreamFinalizerHandler,
  beforeDone?(): void | Promise<void>,
  done?(): void | Promise<void>,
  error?(error: Error): void | Promise<void>,
  beforeCancel?(reason: any): void | Promise<void>,
  cancel?(reason: any): void | Promise<void>
};

export function finalizeStream<T>(stream: ReadableStream<T>, finalizerOrHandlers: StreamFinalizerHandler | FinalizeStreamHandlers): ReadableStream<T> {
  const handlers: FinalizeStreamHandlers = isFunction(finalizerOrHandlers) ? { finalizer: finalizerOrHandlers } : finalizerOrHandlers;

  let reader: ReadableStreamDefaultReader<T>;

  return new ReadableStream<T>({
    start() {
      reader = stream.getReader();
    },
    async pull(controller) {
      let chunk: ReadableStreamReadResult<T>;

      try {
        chunk = await reader.read();
      }
      catch (error) {
        await handlers.error?.(error as Error);
        await handlers.finalizer?.({ type: 'error', error });
        throw error;
      }

      if (chunk.done) {
        await handlers.beforeDone?.();
        controller.close();
        await handlers.done?.();
        await handlers.finalizer?.({ type: 'done' });
      }
      else {
        controller.enqueue(chunk.value);
      }
    },
    async cancel(reason) {
      try {
        await handlers.beforeCancel?.(reason);
        await reader.cancel(reason);
        await handlers.cancel?.(reason);
      }
      catch (error) {
        await handlers.error?.(error as Error);
        throw error;
      }
      finally {
        await handlers.finalizer?.({ type: 'cancel', reason });
      }
    }
  });
}
