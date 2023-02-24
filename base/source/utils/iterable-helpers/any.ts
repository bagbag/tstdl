import type { Predicate } from './types.js';

export function any<T>(iterable: Iterable<T>, predicate: Predicate<T> = (() => true)): boolean {
  let index = 0;

  for (const item of iterable) {
    const matches = predicate(item, index++);

    if (matches) {
      return true;
    }
  }

  return false;
}
