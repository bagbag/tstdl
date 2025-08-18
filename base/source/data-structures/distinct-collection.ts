import { Collection } from './collection.js';

interface BackingSetInternal<T> {
  _getBackingSet(): ReadonlySet<T> | undefined;
};

export abstract class DistinctCollection<T, TThis extends DistinctCollection<T, TThis> = DistinctCollection<T, any>> extends Collection<T, SetIterator<T>, TThis> {
  /** Creates a new set and copies the items */
  toSet(): Set<T> {
    return new Set(this);
  }

  /** Returns an adapter that has the same interface as {@link Set}. No copying of data involved. */
  asSet(): Set<T> {
    return new SetAdapter(this); // eslint-disable-line @typescript-eslint/no-use-before-define
  }

  abstract has(value: T): boolean;
  abstract delete(value: T): boolean;

  /**
   * @internal
   * Do not use directly. For internal adapter optimization.
   */
  protected abstract _getBackingSet(): ReadonlySet<T> | undefined;
}

export class SetAdapter<T> implements Set<T> {
  private readonly collection: DistinctCollection<T>;

  readonly [Symbol.toStringTag] = 'SetAdapter';

  private get fastestBackingSet(): ReadonlySet<T> {
    return (this.collection as unknown as BackingSetInternal<T>)._getBackingSet() ?? this.collection.toSet();
  }

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

  union<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return this.fastestBackingSet.union(other);
  }

  intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
    return this.fastestBackingSet.intersection(other);
  }

  difference<U>(other: ReadonlySetLike<U>): Set<T> {
    return this.fastestBackingSet.difference(other);
  }

  symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return this.fastestBackingSet.symmetricDifference(other);
  }

  isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
    return this.fastestBackingSet.isSubsetOf(other);
  }

  isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
    return this.fastestBackingSet.isSupersetOf(other);
  }

  isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
    return this.fastestBackingSet.isDisjointFrom(other);
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
    for (const value of this.collection) {
      callbackfn.call(thisArg, value, value, this);
    }
  }

  has(value: T): boolean {
    return this.collection.has(value);
  }

  *entries(): SetIterator<[T, T]> {
    for (const item of this.collection) {
      yield [item, item];
    }
  }

  keys(): SetIterator<T> {
    return this.collection.items();
  }

  values(): SetIterator<T> {
    return this.collection.items();
  }

  [Symbol.iterator](): SetIterator<T> {
    return this.collection[Symbol.iterator]();
  }
}
