import { assert as assertHelper } from '../type-guards';
import type { Predicate, TypePredicate } from './types';

export function* assert<T, TPredicate extends T = T>(iterable: Iterable<T>, predicate: Predicate<T> | TypePredicate<T, TPredicate>): IterableIterator<TPredicate> {
  let index = 0;

  for (const item of iterable) {
    assertHelper(predicate(item, index++));
    yield item;
  }
}
