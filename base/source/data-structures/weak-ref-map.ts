import { ObservableFinalizationRegistry } from '#/memory/observable-finalization-registry.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import { takeUntil } from 'rxjs';
import { Collection } from './collection.js';

export class WeakRefMap<K, V extends object> extends Collection<[K, V], MapIterator<[K, V]>, WeakRefMap<K, V>> implements Map<K, V> {
  private readonly backingMapProvider: () => Map<K, WeakRef<V>>;

  private backingMap: Map<K, WeakRef<V>>;
  private finalizationRegistry: ObservableFinalizationRegistry<K>;

  readonly [Symbol.toStringTag] = 'WeakRefMap';

  /**
   * Provides the real size. This is slow because it requires a cleanup iteration
   */
  get realSize(): number {
    this.cleanup();
    return this.size;
  }

  static get supported(): boolean {
    return (typeof WeakRef != 'undefined');
  }

  constructor(backingMapProvider: () => Map<K, WeakRef<V>> = () => new Map()) {
    super();

    this.backingMapProvider = backingMapProvider;

    this._clear();
  }

  includes([key, value]: [K, V]): boolean {
    if (!this.has(key)) {
      return false;
    }

    return this.get(key) == value;
  }

  has(key: K): boolean {
    return isDefined(this.get(key));
  }

  get(key: K): V | undefined {
    const weakRef = this.backingMap.get(key);

    if (isUndefined(weakRef)) {
      return undefined;
    }

    const value = weakRef.deref();

    if (isUndefined(value)) {
      this.delete(key);
    }

    return value;
  }

  add(value: [K, V]): void {
    this.set(value[0], value[1]);
  }

  addMany(values: Iterable<[K, V]>): void {
    for (const [key, value] of values) {
      this.set(key, value);
    }
  }

  set(key: K, value: V): this {
    const has = this.has(key);

    if (this.has(key)) {
      this.finalizationRegistry.unregister(this.get(key)!);
    }

    this.backingMap.set(key, new WeakRef(value));
    this.finalizationRegistry.register(value, key, value);

    if (!has) {
      this.incrementSize();
    }

    return this;
  }

  delete(key: K): boolean {
    const weakRef = this.backingMap.get(key);

    if (isUndefined(weakRef)) {
      return false;
    }

    const value = weakRef.deref();

    if (isDefined(value)) {
      this.finalizationRegistry.unregister(value);
    }

    const deleted = this.backingMap.delete(key);

    if (deleted) {
      this.decrementSize();
    }

    return deleted;
  }

  /** Prune garbage collected entries */
  cleanup(): void {
    for (const _ of this) {
      // Ignore
    }
  }

  clone(): WeakRefMap<K, V> {
    const clone = new WeakRefMap(this.backingMapProvider);
    clone.addMany(this);

    return clone;
  }

  forEach(callback: (value: V, key: K, map: WeakRefMap<K, V>) => void, thisArg?: any): void {
    const boundCallback = callback.bind(thisArg);

    for (const [key, value] of this) {
      boundCallback(value, key, this);
    }
  }

  entries(): MapIterator<[K, V]> {
    return this.items();
  }

  *keys(): MapIterator<K> {
    for (const [key] of this) {
      yield key;
    }
  }

  *values(): MapIterator<V> {
    for (const [, value] of this) {
      yield value;
    }
  }

  *items(): MapIterator<[K, V]> {
    for (const [key, ref] of this.backingMap) {
      const value = ref.deref();

      if (isUndefined(value)) {
        this.delete(key);
        continue;
      }

      yield [key, value];
    }
  }

  protected _clear(): void {
    this.backingMap = this.backingMapProvider();
    this.finalizationRegistry = new ObservableFinalizationRegistry();

    this.finalizationRegistry.finalize$
      .pipe(takeUntil(this.clear$))
      .subscribe((key) => this.delete(key));
  }
}
