import { ObservableCollectionBase } from './observable-collection-base.js';
import type { ObservableCollection } from './observable-collection.js';

export class ObservableSet<T> extends ObservableCollectionBase<T, ObservableSet<T>> implements Set<T>, ObservableCollection<T> {
  private readonly backingSet: Set<T>;

  readonly [Symbol.toStringTag]: 'ObservableSet';

  get self(): this {
    return this;
  }

  get length(): number {
    return this.backingSet.size;
  }

  get size(): number {
    return this.backingSet.size;
  }

  constructor(values?: Iterable<T> | null) {
    super();

    this[Symbol.toStringTag] = 'ObservableSet';
    this.backingSet = new Set(values);
  }

  add(value: T): this {
    this.backingSet.add(value);
    this.onAdd([value]);

    return this;
  }

  addMany(values: T[]): this {
    const newValues = values.filter((value) => !this.backingSet.has(value));

    for (const newValue of newValues) {
      this.backingSet.add(newValue);
    }

    this.onAdd(newValues);
    return this;
  }

  clear(): void {
    this.backingSet.clear();
    this.onClear();
  }

  remove(value: T): boolean {
    const success = this.backingSet.delete(value);

    if (success) {
      this.onRemove([value]);
    }

    return success;
  }

  removeMany(values: T[]): number {
    const deletedValues: T[] = [];

    for (const value of values) {
      const deleted = this.backingSet.delete(value);

      if (deleted) {
        deletedValues.push(value);
      }
    }

    this.onRemove(deletedValues);

    return deletedValues.length;
  }

  delete(value: T): boolean {
    return this.remove(value);
  }

  union<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return this.backingSet.union(other);
  }

  intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
    return this.backingSet.intersection(other);
  }

  difference<U>(other: ReadonlySetLike<U>): Set<T> {
    return this.backingSet.difference(other);
  }

  symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return this.backingSet.symmetricDifference(other);
  }

  isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
    return this.backingSet.isSubsetOf(other);
  }

  isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
    return this.backingSet.isSupersetOf(other);
  }

  isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
    return this.backingSet.isDisjointFrom(other);
  }

  forEach(callback: (value: T, value2: T, set: ObservableSet<T>) => void, thisArg?: any): void {
    const boundCallback = callback.bind(thisArg);
    this.backingSet.forEach((value, value2) => boundCallback(value, value2, this));
  }

  has(value: T): boolean {
    return this.backingSet.has(value);
  }

  entries(): SetIterator<[T, T]> {
    return this.backingSet.entries();
  }

  keys(): SetIterator<T> {
    return this.backingSet.keys();
  }

  values(): SetIterator<T> {
    return this.backingSet.values();
  }

  [Symbol.iterator](): SetIterator<T> {
    return this.backingSet[Symbol.iterator]();
  }
}
