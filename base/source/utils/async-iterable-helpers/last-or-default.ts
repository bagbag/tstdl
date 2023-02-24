import type { AnyIterable } from '../any-iterable-iterator.js';
import type { TypePredicate } from '../iterable-helpers/types.js';
import { filterAsync } from './filter.js';
import type { AsyncPredicate } from './types.js';

export async function lastOrDefaultAsync<T, D, TPredicate extends T = T>(iterable: AnyIterable<T>, defaultValue: D, predicate?: TypePredicate<T, TPredicate> | AsyncPredicate<T>): Promise<TPredicate | D> {
  const source = (predicate == undefined) ? iterable : filterAsync(iterable, predicate);

  let hasLastItem = false;
  let lastItem: T;

  for await (const item of source) {
    hasLastItem = true;
    lastItem = item;
  }

  if (hasLastItem) {
    return lastItem! as T as TPredicate; // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }

  return defaultValue;
}
