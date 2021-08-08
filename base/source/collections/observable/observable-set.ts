import type { ObservableCollection } from './observable-collection';
import { ObservableCollectionBase } from './observable-collection-base';

export class ObservableSet<T> extends ObservableCollectionBase<T, ObservableSet<T>> implements Set<T>, ObservableCollection<T> {
  private readonly backingSet: Set<T>;

  readonly [Symbol.toStringTag]: 'ObservableSet';

  get self(): ObservableSet<T> {
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

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
    this.backingSet.forEach(callbackfn, thisArg);
  }

  has(value: T): boolean {
    return this.backingSet.has(value);
  }

  entries(): IterableIterator<[T, T]> {
    return this.backingSet.entries();
  }

  keys(): IterableIterator<T> {
    return this.backingSet.keys();
  }

  values(): IterableIterator<T> {
    return this.backingSet.values();
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingSet[Symbol.iterator]();
  }
}
