import { AnyIterable } from '../any-iterable-iterator';

export async function* concatAsync<T1, T2>(iterable1: AnyIterable<T1>, iterable2: AnyIterable<T2>): AsyncIterableIterator<T1 | T2> {
  yield* iterable1;
  yield* iterable2;
}
