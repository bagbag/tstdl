import { Enumerable } from '../enumerable';
import type { Comparator } from '../utils';
import { compareByValue } from '../utils';
import { SortedArrayList } from './sorted-array-list';

export class SortedMap<K extends KComparator, V, KComparator = K> {
  private readonly comparator: Comparator<[KComparator, undefined | V]>;

  backingMap: Map<K, [K, V]>;
  backingSortedArray: SortedArrayList<[K, V], [KComparator, undefined | V]>;

  get size(): number {
    return this.backingSortedArray.length;
  }

  constructor(comparator: Comparator<KComparator> = compareByValue) {
    this.comparator = ([key1], [key2]) => comparator(key1, key2);

    this.backingMap = new Map();
    this.backingSortedArray = new SortedArrayList(this.comparator);
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.backingSortedArray[Symbol.iterator]();
  }

  keys(): IterableIterator<K> {
    return Enumerable.from(this.backingSortedArray)
      .map(([key]) => key);
  }

  values(): IterableIterator<V> {
    return Enumerable.from(this.backingSortedArray)
      .map(([, value]) => value);
  }

  clear(): void {
    this.backingSortedArray.clear();
    this.backingMap.clear();
  }

  set(key: K, value: V): void {
    const item = [key, value] as [K, V];

    this.backingMap.set(key, item);
    this.backingSortedArray.add(item);
  }

  get(key: K): V | undefined {
    return this.backingMap.get(key)?.[1];
  }

  has(key: K): boolean {
    return this.backingMap.has(key);
  }

  delete(key: K): V | undefined {
    const item = this.backingMap.get(key);

    if (item == undefined) {
      return undefined;
    }

    this.backingMap.delete(key);
    this.backingSortedArray.remove(item);

    return item[1];
  }

  removeAt(index: number): [K, V] {
    const item = this.backingSortedArray.removeAt(index);
    this.backingMap.delete(item[0]);

    return item;
  }

  removeRange(index: number, count: number): Iterable<[K, V]> {
    if (index < 0 || (index + count) > (this.backingSortedArray.length - 1)) {
      throw new Error('out of bounds');
    }

    const items = this.backingSortedArray.removeRange(index, count);

    for (const [key] of items) {
      this.backingMap.delete(key);
    }

    return items;
  }

  removeRangeByComparison(from: KComparator, to: KComparator): Iterable<[K, V]> {
    const left = this.backingSortedArray.findFirstIndexEqualOrLargerThan([from, undefined]);
    const right = this.backingSortedArray.findLastIndexEqualOrSmallerThan([to, undefined]);

    if (left != undefined && right != undefined) {
      const items = this.backingSortedArray.removeRange(left, (right - left) + 1);

      for (const [key] of items) {
        this.backingMap.delete(key);
      }

      return items;
    }

    return [];
  }
}
