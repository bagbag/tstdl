import { Enumerable } from '#/enumerable';
import { isDefined, isUndefined } from './type-guards';

export class WeakRefMap<K, V extends object> implements Map<K, V> {
  private readonly finalizationRegistry: FinalizationRegistry<K>;

  readonly [Symbol.toStringTag]: 'WeakRefMap';
  readonly backingMap: Map<K, WeakRef<V>>;

  /**
   * this may provide incorrect values depending on when finalizers are run
   */
  get size(): number {
    return this.backingMap.size;
  }

  /**
   * provides true size. Slow because it requires a cleanup iteration
   */
  get trueSize(): number {
    this.cleanup();
    return this.size;
  }

  static get supported(): boolean {
    return typeof WeakRef != 'undefined';
  }

  constructor(backingMap?: Map<K, WeakRef<V>>) {
    this.finalizationRegistry = new FinalizationRegistry((value) => this.finalize(value));

    this[Symbol.toStringTag] = 'WeakRefMap';
    this.backingMap = backingMap ?? new Map();
  }

  clear(): void {
    this.backingMap.clear();
  }

  has(key: K): boolean {
    return isDefined(this.get(key));
  }

  get(key: K): V | undefined {
    return this.backingMap.get(key)?.deref();
  }

  set(key: K, value: V): this {
    this.backingMap.set(key, new WeakRef(value));
    this.finalizationRegistry.register(value, key);

    return this;
  }

  delete(key: K): boolean {
    return this.backingMap.delete(key);
  }

  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    const boundCallback = callbackfn.bind(thisArg);

    for (const [key, ref] of this.backingMap) {
      const value = ref.deref();

      if (isDefined(value)) {
        boundCallback(value, key, this);
      }
      else {
        this.delete(key);
      }
    }
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    const mapped = Enumerable.from(this.backingMap)
      .map(([key, ref]) => [key, ref.deref()] as [K, V | undefined])
      .filter<[K, V]>(([key, value]) => {
        const has = isDefined(value);

        if (!has) {
          this.delete(key);
        }

        return has;
      });

    return mapped[Symbol.iterator]();
  }

  entries(): IterableIterator<[K, V]> {
    return this[Symbol.iterator]();
  }

  *keys(): IterableIterator<K> {
    yield* Enumerable.from(this).map(([key]) => key);
  }

  *values(): IterableIterator<V> {
    yield* Enumerable.from(this).map(([, value]) => value);
  }

  cleanup(): void {
    Enumerable.from(this).drain();
  }

  private finalize(key: K): void {
    const ref = this.backingMap.get(key);

    if (isDefined(ref) && isUndefined(ref.deref())) {
      this.delete(key);
    }
  }
}
