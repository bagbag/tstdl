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

  forEach(callback: (value: T, value2: T, set: KeyedSet<T>) => void, thisArg?: any): void {
    const boundCallback = callback.bind(thisArg);
    this.backingMap.forEach((value) => boundCallback(value, value, this));
  }

  has(value: T): boolean {
    const key = this.selector(value);
    return this.backingMap.has(key);
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingMap.values();
  }

  *entries(): IterableIterator<[T, T]> {
    yield* map(this.backingMap.values(), (value): [T, T] => [value, value]);
  }

  keys(): IterableIterator<T> {
    return this.backingMap.values();
  }

  values(): IterableIterator<T> {
    return this.backingMap.values();
  }
}
