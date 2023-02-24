import type { AnyIterable } from '../any-iterable-iterator.js';
import { isIterable } from '../iterable-helpers/is-iterable.js';

export async function toSetAsync<T>(iterable: AnyIterable<T>): Promise<Set<T>> {
  if (isIterable(iterable)) {
    return new Set(iterable);
  }

  const set = new Set<T>();

  for await (const item of iterable) {
    set.add(item);
  }

  return set;
}
