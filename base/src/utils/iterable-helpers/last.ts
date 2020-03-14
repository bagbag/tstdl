import { filter } from './filter';
import { Predicate } from './types';

export function last<T>(iterable: Iterable<T>, predicate?: Predicate<T>): T {
  const source = (predicate == undefined) ? iterable : filter(iterable, predicate);

  let hasLastItem = false;
  let lastItem: T;

  for (const item of source) {
    hasLastItem = true;
    lastItem = item;
  }

  if (hasLastItem) {
    return lastItem!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }

  throw new Error('iterable was either empty or no element matched predicate');
}
