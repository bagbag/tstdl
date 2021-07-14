import type { AnyIterable } from '../any-iterable-iterator';

// eslint-disable-next-line @typescript-eslint/require-await
export async function* toAsyncIterableIterator<T>(iterable: AnyIterable<T>): AsyncIterableIterator<T> {
  yield* iterable;
}
