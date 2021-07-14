import type { AnyIterable } from '../any-iterable-iterator';

export async function* deferredAsyncIterable<T>(source: () => (AnyIterable<T> | Promise<AnyIterable<T>>)): AsyncIterableIterator<T> {
  const iterable = await source();
  yield* iterable;
}
