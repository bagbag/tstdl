export function readableStreamFromPromise<T>(executor: () => Promise<ReadableStream<T>>): ReadableStream<T> {
  const stream = new TransformStream<T, T>();

  executor()
    .then(async (readable) => readable.pipeTo(stream.writable))
    .catch(async (error) => stream.writable.abort(error));

  return stream.readable;
}
