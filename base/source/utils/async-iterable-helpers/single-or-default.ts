import type { AnyIterable } from '../any-iterable-iterator.js';
import type { TypePredicate } from '../iterable-helpers/types.js';
import type { AsyncPredicate } from './types.js';

export async function singleOrDefaultAsync<T, D, TPredicate extends T = T>(iterable: AnyIterable<T>, defaultValue: D, predicate: TypePredicate<T, TPredicate> | AsyncPredicate<T> = (() => true)): Promise<TPredicate | D> {
  let matched = false;
  let result: TPredicate | D = defaultValue;

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
      result = item as Awaited<TPredicate>;
    }
  }

  return result;
}
