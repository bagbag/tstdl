export class Cache<K, V> {
  private readonly cache: Map<K, V>;

  private _capacity: number;

  get capacity(): number {
    return this._capacity;
  }

  set capacity(capacity: number) {
    if (capacity < 0) {
      throw new Error('Capacity must be positive.');
    }

    const itemsToRemove = Math.max(0, this.cache.size - capacity);
    this.removeEntries(itemsToRemove);
    this._capacity = capacity;
  }

  constructor(capacity: number) {
    this.cache = new Map();
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const value = this.cache.get(key)!;

    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  set(key: K, value: V): void {
    const isNew = !this.cache.has(key);

    if (isNew && (this.cache.size >= this.capacity)) {
      this.removeEntries(1);
    }

    this.cache.set(key, value);
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  private removeEntries(count: number): void {
    if (count <= 0) {
      return;
    }

    let left = count;

    for (const key of this.cache.keys()) {
      if (left-- <= 0) {
        return;
      }

      this.cache.delete(key);
    }
  }
}
