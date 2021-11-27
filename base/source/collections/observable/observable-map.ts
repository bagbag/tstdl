import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

export class ObservableMap<K, V> implements Map<K, V> {
  private readonly backingMap: Map<K, V>;
  private readonly subject: BehaviorSubject<ObservableMap<K, V>>;

  readonly [Symbol.toStringTag]: 'ObservableMap';

  get observe$(): Observable<ObservableMap<K, V>> {
    return this.subject.asObservable();
  }

  get size(): number {
    return this.backingMap.size;
  }

  constructor() {
    this[Symbol.toStringTag] = 'ObservableMap';
    this.backingMap = new Map();
    this.subject = new BehaviorSubject(this as ObservableMap<K, V>);
  }

  get(key: K): V | undefined {
    return this.backingMap.get(key);
  }

  set(key: K, value: V): this {
    this.backingMap.set(key, value);
    this.next();

    return this;
  }

  clear(): void {
    this.backingMap.clear();
    this.next();
  }

  delete(key: K): boolean {
    const success = this.backingMap.delete(key);

    if (success) {
      this.next();
    }

    return success;
  }


  forEach(callback: (value: V, key: K, map: ObservableMap<K, V>) => void, thisArg?: any): void {
    const boundCallback = callback.bind(thisArg);
    this.backingMap.forEach((value, key) => boundCallback(value, key, this));
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

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.backingMap[Symbol.iterator]();
  }

  private next(): void {
    this.subject.next(this);
  }
}
