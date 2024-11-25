import { DeferredPromise } from '../../promise/deferred-promise.js';

export class AwaitableSet<T> implements Set<T> {
  private readonly backingSet: Set<T>;
  private readonly _added: DeferredPromise<T>;
  private readonly _deleted: DeferredPromise<T>;
  private readonly _cleared: DeferredPromise;

  readonly [Symbol.toStringTag]: 'AwaitableSet';

  get added(): Promise<T | T[]> {
    return this._added;
  }

  get cleared(): Promise<void> {
    return this._cleared;
  }

  get deleted(): Promise<T> {
    return this._deleted;
  }

  get size(): number {
    return this.backingSet.size;
  }

  constructor() {
    this.backingSet = new Set();

    this[Symbol.toStringTag] = 'AwaitableSet';
    this._added = new DeferredPromise();
    this._cleared = new DeferredPromise();
    this._deleted = new DeferredPromise();
  }

  add(value: T): this {
    this.backingSet.add(value);
    this._added.resolve(value);
    this._added.reset();

    return this;
  }

  clear(): void {
    this.backingSet.clear();
    this._cleared.resolve();
    this._cleared.reset();
  }

  delete(value: T): boolean {
    const success = this.backingSet.delete(value);

    if (success) {
      this._deleted.resolve(value);
      this._deleted.reset();
    }

    return success;
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

  forEach(callback: (value: T, value2: T, set: AwaitableSet<T>) => void, thisArg?: any): void {
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
