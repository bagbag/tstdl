import type { AnyIterable } from '../any-iterable-iterator.js';
import type { AsyncComparator } from '../sort.js';
import { quickSortInPlaceAsync } from '../sort.js';
import { toArrayAsync } from './to-array.js';

export async function sortAsync<T>(iterable: AnyIterable<T>, comparator?: AsyncComparator<T>): Promise<T[]> {
  const array = await toArrayAsync(iterable);

  await quickSortInPlaceAsync(array, comparator);

  return array;
}
