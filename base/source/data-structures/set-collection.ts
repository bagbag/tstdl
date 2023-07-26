import { DistinctCollection } from './distinct-collection.js';

export class SetCollection<T> extends DistinctCollection<T, SetCollection<T>> implements globalThis.Set<T> {
  private readonly backingSet: globalThis.Set<T>;
  readonly [Symbol.toStringTag]: string = 'Set';

  constructor(items?: Iterable<T>) {
    super();

    this.backingSet = new globalThis.Set(items);
    this.updateSize();
  }

  includes(item: T): boolean {
    return this.has(item);
  }

  add(item: T): this {
    this.backingSet.add(item);
    this.updateSize();

    return this;
  }

  addMany(items: Iterable<T>): void {
    for (const item of items) {
      this.backingSet.add(item);
    }

    this.updateSize();
  }

  clone(): SetCollection<T> {
    return new SetCollection(this);
  }

  items(): IterableIterator<T> {
    return this.backingSet.values();
  }

  delete(item: T): boolean {
    const result = this.backingSet.delete(item);
    this.updateSize();

    return result;
  }

  forEach(callbackfn: (value: T, value2: T, set: globalThis.Set<T>) => void, thisArg?: any): void {
    this.backingSet.forEach(callbackfn, thisArg);
  }

  has(item: T): boolean {
    return this.backingSet.has(item);
  }

  entries(): IterableIterator<[T, T]> {
    return this.backingSet.entries();
  }

  keys(): IterableIterator<T> {
    return this.backingSet.keys();
  }

  values(): IterableIterator<T> {
    return this.backingSet.values();
  }

  protected _clear(): void {
    this.backingSet.clear();
  }

  private updateSize(): void {
    this.setSize(this.backingSet.size);
  }
}
