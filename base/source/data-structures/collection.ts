import { BehaviorSubject, Subject, distinctUntilChanged, filter, firstValueFrom, map, startWith, type Observable } from 'rxjs';

import type { ToJson } from '#/interfaces.js';
import { toLazySignal, untracked, type Signal } from '#/signals/index.js';
import { lazyProperty } from '#/utils/object/lazy-property.js';

export abstract class Collection<T, TThis extends Collection<T, TThis> = Collection<T, any>> implements Iterable<T>, ToJson {
  private readonly sizeSubject = new BehaviorSubject(0);
  private readonly changeSubject = new Subject<TThis>();
  private readonly clearSubject = new Subject<TThis>();

  /** Emits size of collection */
  readonly size$ = this.sizeSubject.asObservable();

  /** Size of collection */
  readonly $size: Signal<number>;

  /** Emits collection on change */
  readonly change$ = this.changeSubject.asObservable();

  /** Emits collection on subscribe and change */
  readonly observe$ = this.change$.pipe(startWith(this as unknown as TThis)) as Observable<TThis>; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion

  /** Notifies on change */
  readonly $observe: Signal<TThis>;

  /* Emits collection on clear */
  readonly clear$ = this.clearSubject.asObservable();

  /** Emits whether the collection is empty */
  readonly isEmpty$ = this.size$.pipe(map(() => this.isEmpty), distinctUntilChanged());

  /** Whether the collection is empty */
  readonly $isEmpty: Signal<boolean>;

  /** Emits whether the collection has items */
  readonly hasItems$ = this.size$.pipe(map(() => this.hasItems), distinctUntilChanged());

  /** Whether the collection has items */
  readonly $hasItems: Signal<boolean>;

  /** Emits when the collection is empty */
  readonly onEmpty$ = this.isEmpty$.pipe(filter((isEmpty) => isEmpty), map(() => undefined));

  /** Emits when the collection has items */
  readonly onItems$ = this.hasItems$.pipe(filter((hasItems) => hasItems), map(() => undefined));

  /** Resolves when the collection is empty */
  get $onEmpty(): Promise<void> {
    return firstValueFrom(this.onEmpty$);
  }

  /** Resolves when the collection has items */
  get $onItems(): Promise<void> {
    return firstValueFrom(this.onItems$);
  }

  /** Size of collection */
  get size(): number {
    return this.sizeSubject.value;
  }

  /** Whether the collection is empty */
  get isEmpty(): boolean {
    return this.size == 0;
  }

  /** Whether the collection has items */
  get hasItems(): boolean {
    return this.size > 0;
  }

  constructor() {
    lazyProperty(this, '$size', () => untracked(() => toLazySignal(this.size$, { requireSync: true, manualCleanup: true })));
    lazyProperty(this, '$observe', () => untracked(() => toLazySignal(this.observe$, { requireSync: true, manualCleanup: true, equal: () => false })));
    lazyProperty(this, '$isEmpty', () => untracked(() => toLazySignal(this.isEmpty$, { requireSync: true, manualCleanup: true })));
    lazyProperty(this, '$hasItems', () => untracked(() => toLazySignal(this.hasItems$, { requireSync: true, manualCleanup: true })));
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.items();
  }

  toArray(): T[] {
    return [...this];
  }

  toJSON(): T[] {
    return this.toArray();
  }

  /** Remove all items */
  clear(): void {
    this._clear();
    this.clearSubject.next(this as unknown as TThis);
    this.setSize(0);
  }

  /** Sets collection size */
  protected setSize(size: number): void {
    if (size != this.size) {
      this.sizeSubject.next(size);
      this.emitChange();
    }
  }

  /** Increment collection size by amount (default 1) */
  protected incrementSize(amount: number = 1): void {
    this.setSize(this.size + amount);
  }

  /** Decrement collection size by amount (default 1) */
  protected decrementSize(amount: number = 1): void {
    this.setSize(this.size - amount);
  }

  protected emitChange(): void {
    this.changeSubject.next(this as unknown as TThis);
  }

  abstract includes(item: T): boolean;

  /** Add item to collection */
  abstract add(item: T): void;

  /** Add many items to collection */
  abstract addMany(items: Iterable<T>): void;

  /** Clone collection */
  abstract clone(): TThis;

  /** Yields all items from the collection */
  abstract items(): IterableIterator<T>;

  /** Clear all data - size is set to 0 automatically */
  protected abstract _clear(): void;
}
