import { Collection } from './collection';

export class Map<K, V> extends Collection<[K, V], Map<K, V>> implements globalThis.Map<K, V> {
  private readonly backingMap: globalThis.Map<K, V>;
  readonly [Symbol.toStringTag]: string = 'Map';

  constructor(items?: Iterable<[K, V]>) {
    super();

    this.backingMap = new globalThis.Map(items);
    this.updateSize();
  }

  set(key: K, value: V): this {
    this.backingMap.set(key, value);
    this.updateSize();

    return this;
  }

  add(item: [K, V]): this {
    return this.set(item[0], item[1]);
  }

  addMany(items: Iterable<[K, V]>): void {
    for (const item of items) {
      this.backingMap.set(item[0], item[1]);
    }

    this.updateSize();
  }

  get(key: K): V | undefined {
    return this.backingMap.get(key);
  }

  clone(): Map<K, V> {
    return new Map(this);
  }

  items(): IterableIterator<[K, V]> {
    return this.backingMap.entries();
  }

  delete(key: K): boolean {
    const result = this.backingMap.delete(key);
    this.updateSize();

    return result;
  }

  forEach(callbackfn: (value: V, key: K, set: globalThis.Map<K, V>) => void, thisArg?: any): void {
    this.backingMap.forEach(callbackfn, thisArg);
  }

  has(key: K): boolean {
    return this.backingMap.has(key);
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

  protected _clear(): void {
    this.backingMap.clear();
  }

  private updateSize(): void {
    this.setSize(this.backingMap.size);
  }
}
