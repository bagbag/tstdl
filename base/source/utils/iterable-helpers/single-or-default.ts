import type { Predicate, TypePredicate } from './types.js';

export function singleOrDefault<T, D, TPredicate extends T = T>(iterable: Iterable<T>, defaultValue: D, predicate: TypePredicate<T, TPredicate> | Predicate<T> = (() => true)): TPredicate | D {
  let matched = false;
  let result: TPredicate | D = defaultValue;
  let index = 0;

  for (const item of iterable) {
    const matches = predicate(item, index++);

    if (matches) {
      if (matched) {
        throw new Error('more than one item matched predicate');
      }

      matched = true;
      result = item as TPredicate;
    }
  }

  return result;
}
