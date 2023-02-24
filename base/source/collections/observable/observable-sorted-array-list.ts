import { binarySearch, binarySearchFirst, binarySearchFirstIndexEqualOrLarger, binarySearchInsertionIndex, binarySearchLast, binarySearchLastIndexEqualOrSmaller } from '#/utils/binary-search.js';
import { compareByValue } from '#/utils/comparison.js';
import type { Comparator } from '#/utils/sort.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import type { ObservableListIndexedEvent, ObservableSortedList } from './observable-list.js';
import { ObservableListBase } from './observable-list-base.js';

export class ObservableSortedArrayList<T extends TComparator, TComparator = T> extends ObservableListBase<T, ObservableSortedArrayList<T>> implements ObservableSortedList<T, TComparator> {
  private readonly comparator: Comparator<TComparator>;

  backingArray: T[];

  get self(): this {
    return this;
  }

  get length(): number {
    return this.backingArray.length;
  }

  constructor(comparator: Comparator<TComparator> = compareByValue) {
    super();

    this.comparator = comparator;

    this.backingArray = [];
  }

  get(index: number): T {
    this.verifyIndexIsInBounds(index);
    return this.backingArray[index]!;
  }

  override getFirst(): T {
    return this.get(0);
  }

  override getLast(): T {
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

  addAt(_index: number, ..._values: T[]): void {
    throw new Error('Adding at index not allowed in sorted collections.');
  }

  removeAt(index: number): T {
    this.verifyIndexIsInBounds(index);

    const value = this.backingArray.splice(index, 1)[0]!;
    this.onRemoveAt([{ index, value }]);

    return value;
  }

  removeRange(index: number, count: number): T[] {
    this.verifyIndexIsInBounds(index);
    this.verifyIndexIsInBounds(index + count - 1);

    const values = this.backingArray.splice(index, count);

    const events: ObservableListIndexedEvent<T>[] = values.map((value, i) => ({ index: index + i, value }));
    this.onRemoveAt(events);

    return values;
  }

  clear(): void {
    this.backingArray = [];
    this.onClear();
  }

  add(value: T): void {
    const index = binarySearchInsertionIndex(this.backingArray, value, this.comparator);
    this.backingArray.splice(index, 0, value);

    this.onAddAt([{ value, index }]);
  }

  addMany(values: T[]): void {
    const events: ObservableListIndexedEvent<T>[] = [];

    for (const value of values) {
      const index = binarySearchInsertionIndex(this.backingArray, value, this.comparator);
      this.backingArray.splice(index, 0, value);
      events.push({ value, index });
    }

    this.onAddAt(events);
  }

  has(value: T): boolean {
    const index = binarySearch(this.backingArray, value, this.comparator);
    return index != undefined;
  }

  hasByComparison(value: TComparator): boolean {
    const index = this.indexOfByComparison(value);
    return index != undefined;
  }

  remove(value: T): boolean {
    const index = binarySearch(this.backingArray, value, this.comparator);

    if ((index == undefined) || (this.backingArray[index] != value)) {
      return false;
    }

    this.backingArray.splice(index, 1);
    this.onRemoveAt([{ value, index }]);

    return true;
  }

  removeMany(values: T[]): number {
    const events: ObservableListIndexedEvent<T>[] = [];

    for (const value of values) {
      const index = binarySearch(this.backingArray, value, this.comparator);

      if ((index == undefined) || (this.backingArray[index] != value)) {
        continue;
      }

      this.backingArray.splice(index, 1);
      events.push({ value, index });
    }

    this.onRemoveAt(events);

    return events.length;
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

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingArray[Symbol.iterator]();
  }

  private verifyIndexIsInBounds(index: number): void {
    if ((index < 0) || (index > (this.backingArray.length - 1))) {
      throw new Error('Index out of bounds.');
    }
  }
}
