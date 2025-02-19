import { resolveValueOrProvider, type ValueOrProvider } from '../value-or-provider.js';

export function readableStreamFromPromise<T>(promiseOrProvider: ValueOrProvider<Promise<ReadableStream<T>>>): ReadableStream<T> {
  const stream = new TransformStream<T, T>();

  resolveValueOrProvider(promiseOrProvider)
    .then(async (readable) => readable.pipeTo(stream.writable))
    .catch(async (error: unknown) => stream.writable.abort(error));

  return stream.readable;
}
