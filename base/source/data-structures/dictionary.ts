import { Collection } from './collection.js';

export abstract class Dictionary<K, V, TThis extends Dictionary<K, V, TThis> = Dictionary<K, V, any>> extends Collection<[K, V], TThis> {
  /** Creates a new map and copies the items */
  toMap(): Map<K, V> {
    return new Map(this);
  }

  /** Returns an adapter that has the same interface as {@link Map}. No copying of data involved. */
  asMap(): Map<K, V> {
    return new DictionaryAdapter(this); // eslint-disable-line @typescript-eslint/no-use-before-define
  }

  abstract has(key: K): boolean;
  abstract get(key: K): V | undefined;
  abstract set(key: K, value: V): void;
  abstract delete(key: K): boolean;
  abstract keys(): IterableIterator<K>;
  abstract values(): IterableIterator<V>;
}

export class DictionaryAdapter<K, V> implements Map<K, V> {
  private readonly dictionary: Dictionary<K, V>;

  readonly [Symbol.toStringTag] = 'DictionaryAdapter';

  get size(): number {
    return this.dictionary.size;
  }

  constructor(dictionary: Dictionary<K, V, any>) {
    this.dictionary = dictionary;
  }

  clear(): void {
    this.dictionary.clear();
  }

  delete(key: K): boolean {
    return this.dictionary.delete(key);
  }

  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    for (const [key, value] of this.dictionary) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  get(key: K): V | undefined {
    return this.dictionary.get(key);
  }

  has(key: K): boolean {
    return this.dictionary.has(key);
  }

  set(key: K, value: V): this {
    this.dictionary.set(key, value);
    return this;
  }

  entries(): IterableIterator<[K, V]> {
    return this.dictionary.items();
  }

  keys(): IterableIterator<K> {
    return this.dictionary.keys();
  }

  values(): IterableIterator<V> {
    return this.dictionary.values();
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.dictionary[Symbol.iterator]();
  }
}
