import type { Predicate } from './types';

export function* takeWhile<T>(iterable: Iterable<T>, yieldLastOnFalse: boolean, predicate: Predicate<T>): IterableIterator<T> {
  let index = 0;
  for (const item of iterable) {
    const take = predicate(item, index++);

    if (take || yieldLastOnFalse) {
      yield item;
    }

    if (!take) {
      break;
    }
  }
}
