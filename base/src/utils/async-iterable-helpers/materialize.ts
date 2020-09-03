import type { AnyIterable } from '../any-iterable-iterator';
import { isAsyncIterable } from './is-async-iterable';
import { toArrayAsync } from './to-array';
import { timeout } from '../timing';

export function materializeAsync<T>(iterable: AnyIterable<T>): AsyncIterable<T> {
  return (isAsyncIterable(iterable))
    ? async(iterable)
    : sync(iterable);
}

function sync<T>(iterable: Iterable<T>): AsyncIterable<T> {
  const materialized = [...iterable];

  const asyncIterable = {
    // eslint-disable-next-line @typescript-eslint/require-await
    async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
      yield* materialized;
    }
  };

  return asyncIterable;
}

function async<T>(iterable: AsyncIterable<T>): AsyncIterable<T> {
  const materializedPromise = toArrayAsync(iterable);

  const asyncIterable = {
    // eslint-disable-next-line @typescript-eslint/require-await
    async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
      yield* await materializedPromise;
    }
  };

  return asyncIterable;
}
