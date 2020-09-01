import { filter } from './filter';
import { Predicate } from './types';

export function first<T>(iterable: Iterable<T>, predicate?: Predicate<T>): T {
  const source = (predicate == undefined) ? iterable : filter(iterable, predicate);

  // eslint-disable-next-line no-unreachable-loop
  for (const item of source) {
    return item;
  }

  throw new Error('iterable was either empty or no element matched predicate');
}
