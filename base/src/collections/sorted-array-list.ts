import type { Comparator } from '../utils';
import { binarySearchInsertionIndex, compareByValue } from '../utils';
import type { SortedList } from './sorted-list';

export class SortedArrayList<T extends TComparator, TComparator = T> implements SortedList<T> {
  private readonly comparator: Comparator<TComparator>;

  backingArray: T[];

  get length(): number {
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

  get(index: number): T {
    if ((index < 0) || (index > (this.backingArray.length - 1))) {
      throw new Error('index out of bounds');
    }

    return this.backingArray[index];
  }

  getFirst(): T {
    return this.get(0);
  }

  getLast(): T {
    return this.get(this.length - 1);
  }

  add(value: T): void {
    const index = binarySearchInsertionIndex(this.backingArray, value, this.comparator);
    this.backingArray.splice(index, 0, value);
  }

  addAt(index: number, ...values: T[]): void {
    this.backingArray.splice(index, 0, ...values);
  }

  removeFirst(): T {
    return this.removeAt(0);
  }

  removeLast(): T {
    return this.removeAt(this.length - 1);
  }

  has(value: T): boolean {
    const index = this.indexOf(value);
    return index != undefined;
  }

  remove(value: T): boolean {
    const index = this.indexOf(value);

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

    return this.backingArray.splice(index, 1)[0];
  }

  removeRange(index: number, count: number): T[] {
    if (index < 0 || (index + count) > (this.backingArray.length - 1)) {
      throw new Error('out of bounds');
    }

    return this.backingArray.splice(index, count);
  }

  removeRangeByComparison(from: TComparator, to: TComparator): Iterable<T> {
    const left = this.findFirstIndexEqualOrLargerThan(from);
    const right = this.findLastIndexEqualOrSmallerThan(to);

    if (left != undefined && right != undefined) {
      return this.backingArray.splice(left, (right - left) + 1);
    }

    return [];
  }

  indexOf(value: T): number | undefined {
    const index = this.findFirstIndexEqualOrLargerThan(value);

    if (index == undefined) {
      return undefined;
    }

    for (let i = index; i < this.backingArray.length; i++) {
      const compareValue = this.backingArray[i];

      if (compareValue == value) {
        return i;
      }

      const comparison = this.comparator(value, compareValue);

      if (comparison != 0) {
        break;
      }
    }

    return undefined;
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
}
