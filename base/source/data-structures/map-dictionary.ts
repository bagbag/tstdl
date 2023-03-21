import { Dictionary } from './dictionary.js';

export class MapDictionary<K, V> extends Dictionary<K, V, MapDictionary<K, V>> {
  private readonly backingMap: Map<K, V>;
  readonly [Symbol.toStringTag]: string = 'MapDictionary';

  constructor(items?: Iterable<readonly [K, V]>) {
    super();

    this.backingMap = new Map(items);
    this.updateSize();
  }

  has(key: K): boolean {
    return this.backingMap.has(key);
  }

  get(key: K): V | undefined {
    return this.backingMap.get(key);
  }

  set(key: K, value: V): void {
    this.backingMap.set(key, value);
    this.updateSize();
  }

  delete(key: K): boolean {
    const result = this.backingMap.delete(key);
    this.updateSize();

    return result;
  }

  includes([key, value]: [K, V]): boolean {
    if (!this.has(key)) {
      return false;
    }

    return this.get(key) == value;
  }

  add(item: [K, V]): void {
    this.set(item[0], item[1]);
  }

  addMany(items: Iterable<readonly [K, V]>): void {
    for (const item of items) {
      this.backingMap.set(item[0], item[1]);
    }

    this.updateSize();
  }

  clone(): MapDictionary<K, V> {
    return new MapDictionary(this);
  }

  items(): IterableIterator<[K, V]> {
    return this.backingMap.entries();
  }

  keys(): IterableIterator<K> {
    return this.backingMap.keys();
  }

  values(): IterableIterator<V> {
    return this.backingMap.values();
  }

  protected _clear(): void {
    this.backingMap.clear();
  }

  private updateSize(): void {
    this.setSize(this.backingMap.size);
  }
}
