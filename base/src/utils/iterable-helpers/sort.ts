import { compareByValue } from '../helpers';
import type { Comparator } from '../sort';

export function sort<T>(iterable: Iterable<T>, comparator: Comparator<T> = compareByValue): T[] {
  const array = [...iterable];
  return array.sort(comparator);
}
