type Factory<Key, Value> = (key: Key) => Value;

export class FactoryMap<K, V> {
  private readonly factory: Factory<K, V>;
  private readonly map: Map<K, V>;

  get size(): number {
    return this.map.size;
  }

  constructor(factory: Factory<K, V>) {
    this.factory = factory;
  }

  clear(): void {
    this.map.clear();
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  get(key: K): V {
    const value = this.map.get(key);

    if (value != undefined) {
      return value;
    }

    const newValue = this.factory(key);
    this.set(key, newValue);
    return newValue;
  }

  set(key: K, value: V): this {
    this.map.set(key, value);
    return this;
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    this.map.forEach(callbackfn, thisArg);
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.map[Symbol.iterator]();
  }

  entries(): IterableIterator<[K, V]> {
    return this.map.entries();
  }

  keys(): IterableIterator<K> {
    return this.map.keys();
  }

  values(): IterableIterator<V> {
    return this.map.values();
  }
}
