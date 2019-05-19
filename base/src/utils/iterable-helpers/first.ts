import { Predicate } from './types';
import { filter } from './filter';

export function first<T>(iterable: Iterable<T>, predicate?: Predicate<T>): T {
  const source = (predicate == undefined) ? iterable : filter(iterable, predicate);

  for (const item of source) {
    return item;
  }

  throw new Error('iterable was either empty or no element matched predicate');
}
