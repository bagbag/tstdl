import { filter } from './filter.js';
import type { Predicate, TypePredicate } from './types.js';

export function first<T, TPredicate extends T = T>(iterable: Iterable<T>, predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate {
  const source = (predicate == undefined) ? iterable : filter(iterable, predicate);

  for (const item of source) {
    return item as TPredicate;
  }

  throw new Error('iterable was either empty or no element matched predicate');
}
