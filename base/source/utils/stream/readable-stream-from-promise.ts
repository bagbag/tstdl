import type { ValueOrProvider } from '../value-or-provider.js';
import { resolveValueOrProvider } from '../value-or-provider.js';

export function readableStreamFromPromise<T>(promiseOrProvider: ValueOrProvider<Promise<ReadableStream<T>>>): ReadableStream<T> {
  const stream = new TransformStream<T, T>();

  resolveValueOrProvider(promiseOrProvider)
    .then(async (readable) => readable.pipeTo(stream.writable))
    .catch(async (error) => stream.writable.abort(error));

  return stream.readable;
}
