import { DistinctCollection } from './distinct-collection.js';
import { MultiKeyMap, type NewMapProvider } from './multi-key-map.js';

export class MultiKeySet<T extends any[]> extends DistinctCollection<T> {
  readonly #map: MultiKeyMap<T, true>;

  readonly [Symbol.toStringTag]: string = 'MultiKeySet';

  constructor(newMapProvider?: NewMapProvider) {
    super();

    this.#map = new MultiKeyMap(newMapProvider);
  }

  includes(value: T): boolean {
    return this.#map.has(value);
  }

  addFlat(...value: T): void {
    this.#map.set(value, true);
    this.updateSize();
  }

  add(value: T): void {
    this.#map.set(value, true);
    this.updateSize();
  }

  addMany(values: Iterable<T>): void {
    for (const value of values) {
      this.#map.set(value, true);
    }

    this.updateSize();
  }

  hasFlat(...value: T): boolean {
    return this.#map.has(value);
  }

  has(value: T): boolean {
    return this.#map.has(value);
  }

  deleteFlat(...value: T): boolean {
    const deleted = this.#map.delete(value);
    this.updateSize();

    return deleted;
  }

  delete(value: T): boolean {
    const deleted = this.#map.delete(value);
    this.updateSize();

    return deleted;
  }

  clone(): MultiKeySet<T> {
    const clone = new MultiKeySet<T>();
    clone.addMany(this);

    return clone;
  }

  items(): SetIterator<T> {
    return this.#map.keys();
  }

  protected _clear(): void {
    this.#map.clear();
    this.updateSize();
  }

  protected override _getBackingSet(): ReadonlySet<T> | undefined {
    return undefined;
  }

  private updateSize(): void {
    this.setSize(this.#map.size);
  }
}
