import { filter } from './filter';
import type { Predicate, TypePredicate } from './types';

export function lastOrDefault<T, D, TPredicate extends T = T>(iterable: Iterable<T>, defaultValue: D, predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate | D {
  const source = (predicate == undefined) ? iterable : filter<T, TPredicate>(iterable, predicate);

  let hasLastItem = false;
  let lastItem: T;

  for (const item of source) {
    hasLastItem = true;
    lastItem = item;
  }

  if (hasLastItem) {
    return lastItem! as T as TPredicate; // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }

  return defaultValue;
}
