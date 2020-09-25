import type { Comparator } from '../utils';
import { binarySearch, binarySearchInsertionIndex, compareByValue } from '../utils';
import type { SortedList } from './sorted-list';

export class SortedArrayList<T extends TComparator, TComparator = T> implements SortedList<T> {
  private readonly comparator: Comparator<TComparator>;

  backingArray: T[];

  get size(): number {
    return this.backingArray.length;
  }

  constructor(comparator: Comparator<TComparator> = compareByValue) {
    this.comparator = comparator;

    this.backingArray = [];
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingArray[Symbol.iterator]();
  }

  clear(): void {
    this.backingArray = [];
  }

  findFirstIndexEqualOrLargerThan(value: TComparator): number | undefined {
    let index = binarySearchInsertionIndex(this.backingArray, value, this.comparator);

    while ((index > 0) && (this.comparator(this.backingArray[index - 1], value) == 0)) {
      index--;
    }

    if (index > this.backingArray.length - 1) {
      return undefined;
    }

    return index;
  }

  findLastIndexEqualOrSmallerThan(value: TComparator): number | undefined {
    let index = binarySearchInsertionIndex(this.backingArray, value, this.comparator) - 1;

    while ((index < this.backingArray.length - 1) && (this.comparator(this.backingArray[index + 1], value) == 0)) {
      index++;
    }

    if (index < 0) {
      return undefined;
    }

    return index;
  }

  get(index: number): T {
    return this.backingArray[index];
  }

  add(value: T): void {
    const index = binarySearchInsertionIndex(this.backingArray, value, this.comparator);
    this.backingArray.splice(index, 0, value);
  }

  remove(value: TComparator): boolean {
    const index = binarySearch(this.backingArray, value, this.comparator);

    if (index == undefined) {
      return false;
    }

    this.backingArray.splice(index, 1);

    return true;
  }

  removeAt(index: number): T {
    if (index < this.backingArray.length - 1) {
      throw new Error('out of bounds');
    }

    const [value] = this.backingArray.splice(index, 1);

    return value;
  }
}
