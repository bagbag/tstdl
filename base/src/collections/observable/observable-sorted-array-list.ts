import type { Comparator } from '../../utils';
import { binarySearch, binarySearchInsertionIndex, compareByValue } from '../../utils';
import type { ObservableList, ObservableListIndexedEvent } from './observable-list';
import { ObservableListBase } from './observable-list-base';

export class ObservableSortedArrayList<T> extends ObservableListBase<T, ObservableSortedArrayList<T>> implements ObservableList<T> {
  private readonly comparator: Comparator<T>;

  backingArray: T[];

  get self(): ObservableSortedArrayList<T> {
    return this;
  }

  get length(): number {
    return this.backingArray.length;
  }

  constructor(comparator: Comparator<T> = compareByValue) {
    super();

    this.comparator = comparator;

    this.backingArray = [];
  }

  get(index: number): T {
    if ((index < 0) || (index > (this.backingArray.length - 1))) {
      throw new Error('index out of bounds');
    }

    return this.backingArray[index];
  }

  indexOf(value: T): number | undefined {
    const index = binarySearch(this.backingArray, value);
    return (index == -1) ? undefined : index;
  }

  addAt(index: number, ...values: T[]): void {
    this.backingArray.splice(index, 0, ...values);

    const events: ObservableListIndexedEvent<T>[] = values.map((value, i) => ({ index: index + i, value }));
    this.onAddAt(events);
  }

  removeAt(index: number): T {
    if ((index < 0) || (index > (this.backingArray.length - 1))) {
      throw new Error('index out of bounds');
    }

    const value = this.backingArray.splice(index, 1)[0];
    this.onRemoveAt([{ index, value }]);

    return value;
  }

  removeRange(index: number, count: number): Iterable<T> {
    if ((index < 0) || (index > (this.backingArray.length - 1))) {
      throw new Error('index out of bounds');
    }

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

  has(value: T): boolean {
    const index = binarySearch(this.backingArray, value, this.comparator);
    return index != undefined;
  }

  remove(value: T): boolean {
    const index = binarySearch(this.backingArray, value, this.comparator);

    if (index == undefined) {
      return false;
    }

    this.backingArray.splice(index, 1);
    this.onRemoveAt([{ value, index }]);

    return true;
  }

  findFirstIndexEqualOrLargerThan(value: T): number | undefined {
    let index = binarySearchInsertionIndex(this.backingArray, value, this.comparator);

    while ((index > 0) && (this.comparator(this.backingArray[index - 1], value) == 0)) {
      index--;
    }

    if (index > this.backingArray.length - 1) {
      return undefined;
    }

    return index;
  }

  findLastIndexEqualOrSmallerThan(value: T): number | undefined {
    let index = binarySearchInsertionIndex(this.backingArray, value, this.comparator) - 1;

    while ((index < this.backingArray.length - 1) && (this.comparator(this.backingArray[index + 1], value) == 0)) {
      index++;
    }

    if (index < 0) {
      return undefined;
    }

    return index;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingArray[Symbol.iterator]();
  }
}
