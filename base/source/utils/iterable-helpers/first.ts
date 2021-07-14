import { filter } from './filter';
import type { Predicate, TypePredicate } from './types';

export function first<T, TPredicate extends T = T>(iterable: Iterable<T>, predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate {
  const source = (predicate == undefined) ? iterable : filter(iterable, predicate);

  // eslint-disable-next-line no-unreachable-loop
  for (const item of source) {
    return item as TPredicate;
  }

  throw new Error('iterable was either empty or no element matched predicate');
}
