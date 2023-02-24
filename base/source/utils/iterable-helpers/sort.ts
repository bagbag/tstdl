import { compareByValue } from '../comparison.js';
import type { Comparator } from '../sort.js';

export function sort<T>(iterable: Iterable<T>, comparator: Comparator<T> = compareByValue): T[] {
  const array = [...iterable];
  return array.sort(comparator);
}
