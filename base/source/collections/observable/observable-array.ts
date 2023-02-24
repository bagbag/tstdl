import type { ObservableList, ObservableListIndexedEvent } from './observable-list.js';
import { ObservableListBase } from './observable-list-base.js';

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
    this.verifyIndexIsInBounds(index);
    return this.backingArray[index]!;
  }

  indexOf(value: T): number | undefined {
    const index = this.backingArray.indexOf(value);
    return (index == -1) ? undefined : index;
  }

  lastIndexOf(value: T): number | undefined {
    const index = this.backingArray.lastIndexOf(value);
    return (index == -1) ? undefined : index;
  }

  set(index: number, value: T): void {
    this.verifyIndexIsInBounds(index);

    const oldValue = this.backingArray[index]!;
    this.backingArray[index] = value;

    this.onRemoveAt([{ index, value: oldValue }]);
    this.onAddAt([{ index, value }]);
  }

  addAt(index: number, ...values: T[]): void {
    this.verifyIndexIsInBounds(index);
    this.backingArray.splice(index, 0, ...values);

    const events: ObservableListIndexedEvent<T>[] = values.map((value, i) => ({ index: index + i, value }));
    this.onAddAt(events);
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

  addMany(values: T[]): void {
    const initialIndex = this.backingArray.length;

    this.backingArray.push(...values);

    const events = values.map((value, index): ObservableListIndexedEvent<T> => ({ index: initialIndex + index, value }));
    this.onAddAt(events);
  }

  remove(value: T): boolean {
    const index = this.indexOf(value);

    if (index == undefined) {
      return false;
    }

    this.removeAt(index);
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

  has(value: T): boolean {
    return this.indexOf(value) != undefined;
  }

  private verifyIndexIsInBounds(index: number): void {
    if ((index < 0) || (index > (this.backingArray.length - 1))) {
      throw new Error('Index out of bounds.');
    }
  }
}
