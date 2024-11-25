import { NotSupportedError } from '#/errors/not-supported.error.js';
import { map } from '#/utils/iterable-helpers/map.js';

export enum KeyedSetMode {
  Keep = 0,
  Overwrite = 1
}

export type Selector<T> = (value: T) => any;

export class KeyedSet<T> implements Set<T> {
  private readonly selector: Selector<T>;
  private readonly mode: KeyedSetMode;
  private readonly backingMap: Map<any, T>;

  readonly [Symbol.toStringTag]: 'KeyedSet';

  constructor(selector: Selector<T>, mode: KeyedSetMode = KeyedSetMode.Overwrite) {
    this.selector = selector;
    this.mode = mode;

    this[Symbol.toStringTag] = 'KeyedSet';
    this.backingMap = new Map();
  }

  get size(): number {
    return this.backingMap.size;
  }

  add(value: T): this {
    const key = this.selector(value);

    if (this.mode == KeyedSetMode.Keep && this.backingMap.has(key)) {
      return this;
    }

    this.backingMap.set(key, value);

    return this;
  }

  clear(): void {
    this.backingMap.clear();
  }

  delete(value: T): boolean {
    const key = this.selector(value);
    return this.backingMap.delete(key);
  }

  union<U>(_other: ReadonlySetLike<U>): Set<T | U> {
    throw new NotSupportedError();
  }

  intersection<U>(_other: ReadonlySetLike<U>): Set<T & U> {
    throw new NotSupportedError();
  }

  difference<U>(_other: ReadonlySetLike<U>): Set<T> {
    throw new NotSupportedError();
  }

  symmetricDifference<U>(_other: ReadonlySetLike<U>): Set<T | U> {
    throw new NotSupportedError();
  }

  isSubsetOf(_other: ReadonlySetLike<unknown>): boolean {
    throw new NotSupportedError();
  }

  isSupersetOf(_other: ReadonlySetLike<unknown>): boolean {
    throw new NotSupportedError();
  }

  isDisjointFrom(_other: ReadonlySetLike<unknown>): boolean {
    throw new NotSupportedError();
  }

  forEach(callback: (value: T, value2: T, set: KeyedSet<T>) => void, thisArg?: any): void {
    const boundCallback = callback.bind(thisArg);
    this.backingMap.forEach((value) => boundCallback(value, value, this));
  }

  has(value: T): boolean {
    const key = this.selector(value);
    return this.backingMap.has(key);
  }

  [Symbol.iterator](): SetIterator<T> {
    return this.backingMap.values();
  }

  *entries(): SetIterator<[T, T]> {
    yield* map(this.backingMap.values(), (value): [T, T] => [value, value]);
  }

  keys(): SetIterator<T> {
    return this.backingMap.values();
  }

  values(): SetIterator<T> {
    return this.backingMap.values();
  }
}
