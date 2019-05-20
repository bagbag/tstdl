import { takeWhile } from './take-while';
import { Predicate } from './types';

export function skipWhile<T>(iterable: Iterable<T>, predicate: Predicate<T>): IterableIterator<T> {
  return takeWhile(iterable, false, (item, index) => !predicate(item, index));
}
