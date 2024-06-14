import type { ToJson } from '#/interfaces.js';
import { BehaviorSubject, Subject, distinctUntilChanged, filter, firstValueFrom, map, startWith, type Observable } from 'rxjs';

export abstract class Collection<T, TThis extends Collection<T, TThis> = Collection<T, any>> implements Iterable<T>, ToJson {
  private readonly sizeSubject: BehaviorSubject<number>;
  private readonly changeSubject: Subject<TThis>;
  private readonly clearSubject: Subject<TThis>;

  /** Emits collection on subscribe and change */
  readonly observe$: Observable<TThis>;

  /** Emits size of collection */
  readonly size$: Observable<number>;

  /** Emits collection on change */
  readonly change$: Observable<TThis>;

  /* Emits collection on clear */
  readonly clear$: Observable<TThis>;

  /** Emits when the collection is empty */
  readonly onEmpty$: Observable<void>;

  /** Emits when the collection has items */
  readonly onItems$: Observable<void>;

  /** Emits whether the collection is empty */
  readonly isEmpty$: Observable<boolean>;

  /** Emits whether the collection has items */
  readonly hasItems$: Observable<boolean>;

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
    this.sizeSubject = new BehaviorSubject(0);
    this.changeSubject = new Subject<TThis>();
    this.clearSubject = new Subject<TThis>();

    this.size$ = this.sizeSubject.asObservable();
    this.change$ = this.changeSubject.asObservable();
    this.clear$ = this.clearSubject.asObservable();
    this.observe$ = this.change$.pipe(startWith(this as unknown as TThis));

    this.isEmpty$ = this.size$.pipe(map(() => this.isEmpty), distinctUntilChanged());
    this.hasItems$ = this.size$.pipe(map(() => this.hasItems), distinctUntilChanged());

    this.onEmpty$ = this.isEmpty$.pipe(filter((isEmpty) => isEmpty), map(() => undefined));
    this.onItems$ = this.hasItems$.pipe(filter((hasItems) => hasItems), map(() => undefined));
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
