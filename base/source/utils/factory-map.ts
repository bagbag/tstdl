import { isDefined } from './type-guards';

type Factory<Key, Value> = (key: Key) => Value;

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
    const value = this.backingMap.get(key);

    if (isDefined(value)) {
      return value;
    }

    const newValue = this.factory(key);
    this.set(key, newValue);
    return newValue;
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

  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    this.backingMap.forEach((value, key) => callbackfn(value, key, this), thisArg);
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.backingMap[Symbol.iterator]();
  }

  entries(): IterableIterator<[K, V]> {
    return this.backingMap.entries();
  }

  keys(): IterableIterator<K> {
    return this.backingMap.keys();
  }

  values(): IterableIterator<V> {
    return this.backingMap.values();
  }
}
