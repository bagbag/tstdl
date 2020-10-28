import type { Predicate } from './types';

export function all<T>(iterable: Iterable<T>, predicate: Predicate<T> = (() => true)): boolean {
  let index = 0;

  for (const item of iterable) {
    const matches = predicate(item, index++);

    if (!matches) {
      return false;
    }
  }

  return true;
}
