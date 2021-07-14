import type { AnyIterable } from '../any-iterable-iterator';

export async function* defaultIfEmptyAsync<T, TDefault>(iterable: AnyIterable<T>, defaultValue: TDefault): AsyncIterableIterator<T | TDefault> {
  let empty = true;

  for await (const item of iterable) {
    empty = false;
    yield item;
  }

  if (empty) {
    yield defaultValue;
  }
}
