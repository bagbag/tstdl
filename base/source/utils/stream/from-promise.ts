import { resolveValueOrProvider, type ValueOrProvider } from '../value-or-provider.js';

export function readableStreamFromPromise<T>(promiseOrProvider: ValueOrProvider<Promise<ReadableStream<T>>>): ReadableStream<T> {
  const stream = new TransformStream<T, T>();

  resolveValueOrProvider(promiseOrProvider)
    .then(async (readable) => readable.pipeTo(stream.writable))
    .catch(async (error: unknown) => stream.writable.abort(error).catch(() => { /* noop */ }));

  return stream.readable;
}

export function transformStreamFromPromise<I, O>(promiseOrProvider: ValueOrProvider<Promise<TransformStream<I, O>>>): TransformStream<I, O> {
  const incoming = new TransformStream<I, I>();
  const outgoing = new TransformStream<O, O>();

  void (async () => {
    try {
      const sourceTransformer = await resolveValueOrProvider(promiseOrProvider);

      await incoming.readable.pipeTo(sourceTransformer.writable);
      await sourceTransformer.readable.pipeTo(outgoing.writable);
    }
    catch (e) {
      await incoming.writable.abort(e).catch(() => { /* noop */ });
      await outgoing.writable.abort(e).catch(() => { /* noop */ });
    }
  })();

  return {
    writable: incoming.writable,
    readable: outgoing.readable,
  };
}
