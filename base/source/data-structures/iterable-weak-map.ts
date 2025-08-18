import { takeUntil } from 'rxjs';

import { ObservableFinalizationRegistry } from '#/memory/observable-finalization-registry.js';
import { drain } from '#/utils/iterable-helpers/drain.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import { Dictionary } from './dictionary.js';

type WeakMapEntry<K extends object, V> = { ref: WeakRef<K>, value: V };

export class IterableWeakMap<K extends object, V> extends Dictionary<K, V, IterableWeakMap<K, V>> implements Map<K, V> {
  private weakMap: WeakMap<K, WeakMapEntry<K, V>>;
  private refMap: Map<WeakRef<K>, V>;
  private finalizationRegistry: ObservableFinalizationRegistry<WeakRef<K>>;

  readonly [Symbol.toStringTag] = 'IterableWeakMap';

  /**
   * Provides the real size. This is slow because it requires a cleanup iteration
   */
  get realSize(): number {
    this.cleanup();
    return this.size;
  }

  static get supported(): boolean {
    return (typeof WeakRef != 'undefined') && (typeof WeakMap != 'undefined');
  }

  constructor(entries?: Iterable<readonly [K, V]>) {
    super();

    this._clear();

    if (isDefined(entries)) {
      this.addMany(entries);
    }
  }

  includes([key, value]: [K, V]): boolean {
    if (!this.has(key)) {
      return false;
    }

    return this.get(key) == value;
  }

  has(key: K): boolean {
    return this.weakMap.has(key);
  }

  get(key: K): V | undefined {
    const entry = this.weakMap.get(key);

    if (isUndefined(entry)) {
      return undefined;
    }

    return entry.value;
  }

  add(value: readonly [K, V]): void {
    this.set(value[0], value[1]);
  }

  addMany(values: Iterable<readonly [K, V]>): void {
    for (const [key, value] of values) {
      this.set(key, value);
    }
  }

  set(key: K, value: V): this {
    const existingEntry = this.weakMap.get(key);
    const entry: WeakMapEntry<K, V> = { ref: new WeakRef(key), value };

    this.weakMap.set(key, entry);
    this.refMap.set(entry.ref, value);

    if (isDefined(existingEntry)) {
      const existingKey = existingEntry.ref.deref();

      if (isDefined(existingKey)) {
        this.finalizationRegistry.unregister(existingKey);
      }
    }
    else {
      this.updateSize();
    }

    this.finalizationRegistry.register(key, entry.ref, key);

    return this;
  }

  delete(key: K): boolean {
    const entry = this.weakMap.get(key);

    if (isUndefined(entry)) {
      return false;
    }

    this.weakMap.delete(key);
    const deleted = this.refMap.delete(entry.ref);
    this.finalizationRegistry.unregister(key);

    if (deleted) {
      this.updateSize();
    }

    return deleted;
  }

  /** Prune garbage collected entries */
  cleanup(): void {
    drain(this);
    this.updateSize();
  }

  clone(): IterableWeakMap<K, V> {
    return new IterableWeakMap(this);
  }

  forEach(callback: (value: V, key: K, map: IterableWeakMap<K, V>) => void, thisArg?: any): void {
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
    for (const [ref, value] of this.refMap) {
      const key = ref.deref();

      if (isUndefined(key)) {
        this.refMap.delete(ref);
        continue;
      }

      yield [key, value];
    }
  }

  protected _clear(): void {
    this.weakMap = new WeakMap();
    this.refMap = new Map();
    this.finalizationRegistry = new ObservableFinalizationRegistry();

    this.finalizationRegistry.finalize$
      .pipe(takeUntil(this.clear$))
      .subscribe((ref) => this.refMap.delete(ref));
  }

  private updateSize(): void {
    this.setSize(this.refMap.size);
  }
}
