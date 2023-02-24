import type { AnyIterable } from '../any-iterable-iterator.js';
import type { TypePredicate } from '../iterable-helpers/types.js';
import { filterAsync } from './filter.js';
import type { AsyncPredicate } from './types.js';

export async function firstOrDefaultAsync<T, D, TPredicate extends T = T>(iterable: AnyIterable<T>, defaultValue: D, predicate?: TypePredicate<T, TPredicate> | AsyncPredicate<T>): Promise<TPredicate | D> {
  const source = (predicate == undefined) ? iterable : filterAsync(iterable, predicate);

  // eslint-disable-next-line no-unreachable-loop
  for await (const item of source) {
    return item as Awaited<TPredicate>;
  }

  return defaultValue;
}
