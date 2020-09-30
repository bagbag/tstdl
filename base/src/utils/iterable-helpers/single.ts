import type { Predicate, TypePredicate } from './types';

export function single<T, TPredicate extends T = T>(iterable: Iterable<T>, predicate: TypePredicate<T, TPredicate> | Predicate<T> = (() => true)): TPredicate {
  let matched = false;
  let result: T | undefined;
  let index = 0;

  for (const item of iterable) {
    const matches = predicate(item, index++);

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
