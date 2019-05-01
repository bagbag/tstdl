import { compareByValue } from '../helpers';
import { Comparator } from '../sort';

export function sort<T>(iterable: Iterable<T>, comparator: Comparator<T> = compareByValue): Iterable<T> {
  const array = [...iterable];
  const sorted = array.sort(comparator);

  return sorted;
}
