import type { AnyIterable } from '../any-iterable-iterator';
import type { TypePredicate } from '../iterable-helpers/types';
import { filterAsync } from './filter';
import type { AsyncPredicate } from './types';

export async function firstAsync<T, TPredicate extends T = T>(iterable: AnyIterable<T>, predicate?: TypePredicate<T, TPredicate> | AsyncPredicate<T>): Promise<TPredicate> {
  const source = (predicate == undefined) ? iterable : filterAsync(iterable, predicate);

  // eslint-disable-next-line no-unreachable-loop
  for await (const item of source) {
    return item as Awaited<TPredicate>;
  }

  throw new Error('iterable was either empty or no element matched predicate');
}
