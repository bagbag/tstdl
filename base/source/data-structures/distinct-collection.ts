import { Collection } from './collection.js';

export abstract class DistinctCollection<T, TThis extends DistinctCollection<T, TThis> = DistinctCollection<T, any>> extends Collection<T, TThis> {
  /** Creates a new map and copies the items */
  toSet(): Set<T> {
    return new Set(this);
  }

  /** Returns an adapter that has the same interface as {@link Set}. No copying of data involved. */
  asSet(): Set<T> {
    return new SetAdapter(this); // eslint-disable-line @typescript-eslint/no-use-before-define
  }

  abstract has(value: T): boolean;
  abstract delete(value: T): boolean;
}

export class SetAdapter<T> implements Set<T> {
  private readonly collection: DistinctCollection<T>;

  readonly [Symbol.toStringTag] = 'SetAdapter';

  get size(): number {
    return this.collection.size;
  }

  constructor(set: DistinctCollection<T, any>) {
    this.collection = set;
  }

  add(value: T): this {
    this.collection.add(value);
    return this;
  }

  clear(): void {
    this.collection.clear();
  }

  delete(value: T): boolean {
    return this.collection.delete(value);
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
    for (const value of this.collection) {
      callbackfn.call(thisArg, value, value, this);
    }
  }

  has(value: T): boolean {
    return this.collection.has(value);
  }

  *entries(): IterableIterator<[T, T]> {
    for (const item of this.collection) {
      yield [item, item];
    }
  }

  keys(): IterableIterator<T> {
    return this.collection.items();
  }

  values(): IterableIterator<T> {
    return this.collection.items();
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.collection[Symbol.iterator]();
  }
}
