import { filter } from './filter';
import type { Predicate, TypePredicate } from './types';

export function last<T, TPredicate extends T = T>(iterable: Iterable<T>, predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate {
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

  throw new Error('iterable was either empty or no element matched predicate');
}
