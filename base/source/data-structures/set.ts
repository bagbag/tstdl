import { Collection } from './collection';

export class Set<T> extends Collection<T, Set<T>> implements globalThis.Set<T> {
  private readonly backingSet: globalThis.Set<T>;
  readonly [Symbol.toStringTag]: string = 'Set';

  constructor(items?: Iterable<T>) {
    super();

    this.backingSet = new globalThis.Set(items);
    this.updateSize();
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

  clone(): Set<T> {
    return new Set(this);
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
