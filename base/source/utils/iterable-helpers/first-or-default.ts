import { filter } from './filter.js';
import type { Predicate, TypePredicate } from './types.js';

export function firstOrDefault<T, D, TPredicate extends T = T>(iterable: Iterable<T>, defaultValue: D, predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate | D {
  const source = (predicate == undefined) ? iterable : filter(iterable, predicate);

  for (const item of source) {
    return item as TPredicate;
  }

  return defaultValue;
}
