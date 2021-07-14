import type { AnyIterable } from '../any-iterable-iterator';
import type { AsyncComparator } from '../sort';
import { quickSortInPlaceAsync } from '../sort';
import { toArrayAsync } from './to-array';

export async function sortAsync<T>(iterable: AnyIterable<T>, comparator?: AsyncComparator<T>): Promise<T[]> {
  const array = await toArrayAsync(iterable);

  await quickSortInPlaceAsync(array, comparator);

  return array;
}
