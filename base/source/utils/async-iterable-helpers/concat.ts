import type { AnyIterable } from '../any-iterable-iterator.js';

// eslint-disable-next-line @typescript-eslint/require-await
export async function* concatAsync<T>(...iterables: AnyIterable<T>[]): AsyncIterableIterator<T> {
  for (const iterable of iterables) {
    yield* iterable;
  }
}
