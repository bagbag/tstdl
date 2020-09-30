import type { AnyIterable } from '../any-iterable-iterator';
import type { TypePredicate } from '../iterable-helpers';
import type { AsyncPredicate } from './types';

export async function singleAsync<T, TPredicate extends T = T>(iterable: AnyIterable<T>, predicate: TypePredicate<T, TPredicate> | AsyncPredicate<T> = (() => true)): Promise<TPredicate> {
  let matched = false;
  let result: T | undefined;

  let index = 0;
  for await (const item of iterable) {
    let matches = predicate(item, index++);

    if (matches instanceof Promise) {
      matches = await matches;
    }

    if (matches) {
      if (matched) {
        throw new Error('more than one item matched predicate');
      }

      matched = true;
      result = item;
    }
  }

  if (!matched) {
    throw new Error('no item matched predicate');
  }

  return result as TPredicate;
}
