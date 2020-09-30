import type { Predicate, TypePredicate } from './types';

export function* filter<T, TPredicate extends T = T>(iterable: Iterable<T>, predicate: Predicate<T> | TypePredicate<T, TPredicate>): IterableIterator<TPredicate> {
  let index = 0;

  for (const item of iterable) {
    const matches = predicate(item, index++);

    if (matches) {
      yield item as TPredicate;
    }
  }
}
