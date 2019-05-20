import { AnyIterable } from '../any-iterable-iterator';
import { filterAsync } from './filter';
import { AsyncPredicate } from './types';

export async function firstAsync<T>(iterable: AnyIterable<T>, predicate?: AsyncPredicate<T>): Promise<T> {
  const source = (predicate == undefined) ? iterable : filterAsync(iterable, predicate);

  for await (const item of source) {
    return item;
  }

  throw new Error('iterable was either empty or no element matched predicate');
}
