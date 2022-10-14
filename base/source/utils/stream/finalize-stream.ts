export function finalizeStream<T>(stream: ReadableStream<T>, finalizer: () => void | PromiseLike<void>): ReadableStream<T> {
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
        await finalizer();
        throw error;
      }

      if (chunk.done) {
        controller.close();
        await finalizer();
      }
      else {
        controller.enqueue(chunk.value);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      }
      finally {
        await finalizer();
      }
    }
  });
}
