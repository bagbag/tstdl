import type { ObservableList, ObservableListIndexedEvent } from './observable-list';
import { ObservableListBase } from './observable-list-base';

export class ObservableArray<T> extends ObservableListBase<T, ObservableArray<T>> implements ObservableList<T> {
  backingArray: T[];

  get length(): number {
    return this.backingArray.length;
  }

  get self(): ObservableArray<T> {
    return this;
  }

  constructor() {
    super();

    this.backingArray = [];
  }

  get(index: number): T {
    if ((index < 0) || (index > (this.backingArray.length - 1))) {
      throw new Error('index out of bounds');
    }

    return this.backingArray[index];
  }

  indexOf(value: T): number | undefined {
    const index = this.backingArray.indexOf(value);
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

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingArray[Symbol.iterator]();
  }

  clear(): void {
    this.backingArray = [];
    this.onClear();
  }

  add(value: T): void {
    this.backingArray.push(value);
    this.onAddAt([{ index: this.backingArray.length - 1, value }]);
  }

  remove(value: T): boolean {
    const index = this.indexOf(value);

    if (index == undefined) {
      return false;
    }

    this.removeAt(index);
    return true;
  }

  has(value: T): boolean {
    return this.indexOf(value) != undefined;
  }
}
