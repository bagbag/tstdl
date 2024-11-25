export type Factory<K, V> = (key: K) => V;

export type FactoryItemIdentityProvider<K, I> = (key: K) => I;

/** Same as {@link Map}, except that it will build the value with the provided factory on {@link get} if it doesnt exist */
export class FactoryMap<K, V, I = K> implements Map<K, V> {
  private readonly factory: Factory<K, V>;

  readonly [Symbol.toStringTag]: 'FactoryMap';
  readonly backingMap: Map<I, { key: K, value: V }>;
  readonly identityProvider: FactoryItemIdentityProvider<K, I>;

  get size(): number {
    return this.backingMap.size;
  }

  constructor(factory: Factory<K, V>, backingMap: Map<I, V> | undefined, identityProvider: FactoryItemIdentityProvider<K, I>);
  constructor(factory: Factory<K, V>, backingMap?: Map<K, V>);
  constructor(factory: Factory<K, V>, backingMap?: Map<K, V>, identityProvider?: FactoryItemIdentityProvider<K, I>) {
    this.factory = factory;

    this[Symbol.toStringTag] = 'FactoryMap';
    this.backingMap = backingMap ?? new Map();
    this.identityProvider = identityProvider ?? ((key) => key as any as I);
  }

  clear(): void {
    this.backingMap.clear();
  }

  has(key: K): boolean {
    return this.backingMap.has(this.identityProvider(key));
  }

  get(key: K): V {
    const identity = this.identityProvider(key);

    const has = this.backingMap.has(identity);

    if (has) {
      return this.backingMap.get(identity)!.value;
    }

    const value = this.factory(key);
    this.backingMap.set(identity, { key, value });

    return value;
  }

  getWithoutBuild(key: K): V | undefined {
    return this.backingMap.get(this.identityProvider(key))?.value;
  }

  set(key: K, value: V): this {
    this.backingMap.set(this.identityProvider(key), { key, value });
    return this;
  }

  delete(key: K): boolean {
    return this.backingMap.delete(this.identityProvider(key));
  }

  forEach(callback: (value: V, key: K, map: FactoryMap<K, V, I>) => void, thisArg?: any): void {
    const boundCallback = callback.bind(thisArg);
    this.backingMap.forEach(({ key, value }) => boundCallback(value, key, this));
  }

  *[Symbol.iterator](): MapIterator<[K, V]> {
    for (const [, { key, value }] of this.backingMap) {
      yield [key, value];
    }
  }

  *entries(): MapIterator<[K, V]> {
    for (const [, { key, value }] of this.backingMap.entries()) {
      yield [key, value];
    }
  }

  *keys(): MapIterator<K> {
    for (const [, { key }] of this.backingMap.entries()) {
      yield key;
    }
  }

  *values(): MapIterator<V> {
    for (const [, { value }] of this.backingMap.entries()) {
      yield value;
    }
  }
}
