export type Factory<Key, Value> = (key: Key) => Value;

/** same as {@link Map}, except that it will build the value with the provided factory on {@link get} if it doesnt exist */
export class FactoryMap<K, V> implements Map<K, V> {
  private readonly factory: Factory<K, V>;

  readonly [Symbol.toStringTag]: 'FactoryMap';
  readonly backingMap: Map<K, V>;

  get size(): number {
    return this.backingMap.size;
  }

  constructor(factory: Factory<K, V>, backingMap?: Map<K, V>) {
    this.factory = factory;

    this[Symbol.toStringTag] = 'FactoryMap';
    this.backingMap = backingMap ?? new Map();
  }

  clear(): void {
    this.backingMap.clear();
  }

  has(key: K): boolean {
    return this.backingMap.has(key);
  }

  get(key: K): V {
    const has = this.backingMap.has(key);

    if (has) {
      return this.backingMap.get(key)!;
    }

    const value = this.factory(key);
    this.backingMap.set(key, value);

    return value;
  }

  getWithoutBuild(key: K): V | undefined {
    return this.backingMap.get(key);
  }

  set(key: K, value: V): this {
    this.backingMap.set(key, value);
    return this;
  }

  delete(key: K): boolean {
    return this.backingMap.delete(key);
  }

  forEach(callback: (value: V, key: K, map: FactoryMap<K, V>) => void, thisArg?: any): void {
    const boundCallback = callback.bind(thisArg);
    this.backingMap.forEach((value, key) => boundCallback(value, key, this));
  }

  *[Symbol.iterator](): IterableIterator<[K, V]> {
    yield* this.backingMap[Symbol.iterator]();
  }

  *entries(): IterableIterator<[K, V]> {
    yield* this.backingMap.entries();
  }

  *keys(): IterableIterator<K> {
    yield* this.backingMap.keys();
  }

  *values(): IterableIterator<V> {
    yield* this.backingMap.values();
  }
}
