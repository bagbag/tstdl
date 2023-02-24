import { compareByValue } from '#/utils/comparison.js';
import type { Comparator } from '#/utils/sort.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import { binarySearch, binarySearchFirst, binarySearchFirstIndexEqualOrLarger, binarySearchInsertionIndex, binarySearchLast, binarySearchLastIndexEqualOrSmaller } from '../utils/binary-search.js';
import type { SortedList } from './sorted-list.js';

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

  static from<T extends TComparator, TComparator = T>(iterable: Iterable<T>, comparator: Comparator<TComparator> = compareByValue): SortedArrayList<T, TComparator> {
    const list = new SortedArrayList<T, TComparator>(comparator);
    list.backingArray = [...iterable].sort(comparator);

    return list;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingArray[Symbol.iterator]();
  }

  clear(): void {
    this.backingArray = [];
  }

  get(index: number): T {
    this.verifyIndexIsInBounds(index);
    return this.backingArray[index]!;
  }

  getFirst(): T {
    return this.get(0);
  }

  getLast(): T {
    return this.get(this.length - 1);
  }

  getByComparison(value: TComparator): T | undefined {
    const index = this.indexOfByComparison(value);
    return isDefined(index) ? this.get(index) : undefined;
  }

  getRangeByComparison(from: TComparator, to: TComparator): T[] {
    const left = this.findFirstIndexEqualOrLargerThan(from);
    const right = this.findLastIndexEqualOrSmallerThan(to);

    if (isUndefined(left) || isUndefined(right)) {
      return [];
    }

    return this.backingArray.slice(left, right + 1);
  }

  set(_index: number, _value: T): void {
    throw new Error('Assignment by index not allowed in sorted collections.');
  }

  add(value: T): void {
    const index = binarySearchInsertionIndex(this.backingArray, value, this.comparator);
    this.backingArray.splice(index, 0, value);
  }

  addMany(values: T[]): void {
    for (const value of values) {
      this.add(value);
    }
  }

  addAt(_index: number, ..._values: T[]): void {
    throw new Error('Adding at index not allowed in sorted collections.');
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

  hasByComparison(value: TComparator): boolean {
    const index = this.indexOfByComparison(value);
    return index != undefined;
  }

  remove(value: T): boolean {
    const index = this.indexOf(value);

    if ((index == undefined) || (this.backingArray[index] != value)) {
      return false;
    }

    this.backingArray.splice(index, 1);

    return true;
  }

  removeMany(values: T[]): number {
    let counter = 0;

    for (const value of values) {
      const removed = this.remove(value);

      if (removed) {
        counter++;
      }
    }

    return counter;
  }

  removeAt(index: number): T {
    this.verifyIndexIsInBounds(index);
    return this.backingArray.splice(index, 1)[0]!;
  }

  removeRange(index: number, count: number): T[] {
    this.verifyIndexIsInBounds(index);
    this.verifyIndexIsInBounds(index + count - 1);
    return this.backingArray.splice(index, count);
  }

  removeRangeByComparison(from: TComparator, to: TComparator): T[] {
    const left = this.findFirstIndexEqualOrLargerThan(from);
    const right = this.findLastIndexEqualOrSmallerThan(to);

    if (isUndefined(left) || isUndefined(right)) {
      return [];
    }

    return this.removeRange(left, (right - left) + 1);
  }

  indexOf(value: T): number | undefined {
    const left = this.findFirstIndexEqualOrLargerThan(value);
    const right = this.findLastIndexEqualOrSmallerThan(value);

    if (isUndefined(left) || isUndefined(right)) {
      return undefined;
    }

    for (let i = left; i <= right; i++) {
      if (this.backingArray[i] == value) {
        return i;
      }
    }

    return undefined;
  }

  lastIndexOf(value: T): number | undefined {
    const left = this.findFirstIndexEqualOrLargerThan(value);
    const right = this.findLastIndexEqualOrSmallerThan(value);

    if (isUndefined(left) || isUndefined(right)) {
      return undefined;
    }

    for (let i = right; i >= left; i--) {
      if (this.backingArray[i] == value) {
        return i;
      }
    }

    return undefined;
  }

  indexOfByComparison(value: TComparator): number | undefined {
    return binarySearch(this.backingArray, value, this.comparator);
  }

  firstIndexOfByComparison(value: TComparator): number | undefined {
    return binarySearchFirst(this.backingArray, value, this.comparator);
  }

  lastIndexOfByComparison(value: TComparator): number | undefined {
    return binarySearchLast(this.backingArray, value, this.comparator);
  }

  findFirstIndexEqualOrLargerThan(value: TComparator): number | undefined {
    return binarySearchFirstIndexEqualOrLarger(this.backingArray, value, this.comparator);
  }

  findLastIndexEqualOrSmallerThan(value: TComparator): number | undefined {
    return binarySearchLastIndexEqualOrSmaller(this.backingArray, value, this.comparator);
  }

  private verifyIndexIsInBounds(index: number): void {
    if ((index < 0) || (index > (this.backingArray.length - 1))) {
      throw new Error('Index out of bounds.');
    }
  }
}
