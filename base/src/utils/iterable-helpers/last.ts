import { filter } from './filter';
import { Predicate } from './types';

export function last<T>(iterable: Iterable<T>, predicate?: Predicate<T>): T {
  const source = (predicate == undefined) ? iterable : filter(iterable, predicate);

  let hasLastItem: boolean = false;
  let lastItem: T;

  for (const item of source) {
    hasLastItem = true;
    lastItem = item;
  }

  if (hasLastItem) {
    // tslint:disable-next-line: no-non-null-assertion
    return lastItem!;
  }

  throw new Error('iterable was either empty or no element matched predicate');
}
