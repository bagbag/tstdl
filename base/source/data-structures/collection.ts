import { Enumerable } from '#/enumerable';
import { firstValueFrom } from '#/rxjs/compat';
import type { Observable } from 'rxjs';
import { BehaviorSubject, distinctUntilChanged, filter, map, mapTo, Subject } from 'rxjs';

export abstract class Collection<T, TThis extends Collection<T, TThis>> implements Iterable<T>{
  private readonly sizeSubject: BehaviorSubject<number>;
  private readonly changeSubject: Subject<TThis>;

  /** emits collection on change */
  readonly change$: Observable<TThis>;

  /** emits size of list */
  readonly size$: Observable<number>;

  /** emits when the list is empty */
  readonly onEmpty$: Observable<void>;

  /** emits when the list has items */
  readonly onItems$: Observable<void>;

  /** emits whether the list is empty */
  readonly isEmpty$: Observable<boolean>;

  /** emits whether the list has items */
  readonly hasItems$: Observable<boolean>;

  /** resolves when the list is empty */
  get $onEmpty(): Promise<void> {
    return firstValueFrom(this.onEmpty$);
  }

  /** resolves when the list has items */
  get $onItems(): Promise<void> {
    return firstValueFrom(this.onItems$);
  }

  /** size of list */
  get size(): number {
    return this.sizeSubject.value;
  }

  /** whether the list is empty */
  get isEmpty(): boolean {
    return this.size == 0;
  }

  /** whether the list has items */
  get hasItems(): boolean {
    return this.size > 0;
  }

  constructor() {
    this.sizeSubject = new BehaviorSubject(0);
    this.changeSubject = new Subject<TThis>();

    this.change$ = this.changeSubject.asObservable();
    this.size$ = this.sizeSubject.asObservable();

    this.isEmpty$ = this.size$.pipe(map(() => this.isEmpty), distinctUntilChanged());
    this.hasItems$ = this.size$.pipe(map(() => this.hasItems), distinctUntilChanged());

    this.onEmpty$ = this.isEmpty$.pipe(filter((isEmpty) => isEmpty), mapTo(undefined));
    this.onItems$ = this.hasItems$.pipe(filter((isFull) => isFull), mapTo(undefined));
  }

  asEnumerable(): Enumerable<T> {
    return Enumerable.from(this);
  }

  /** sets collection size */
  protected setSize(size: number): void {
    if (size != this.size) {
      this.sizeSubject.next(size);
      this.emitChange();
    }
  }

  /** increment collection size by amount (default 1) */
  protected incrementSize(amount: number = 1): void {
    this.setSize(this.size + amount);
  }

  /** decrement collection size by amount (default 1) */
  protected decrementSize(amount: number = 1): void {
    this.setSize(this.size - amount);
  }

  /**  */
  protected emitChange(): void {
    this.changeSubject.next(this as unknown as TThis);
  }

  abstract add(value: T): void;

  abstract addMany(values: Iterable<T>): void;

  abstract clear(): void;

  abstract clone(): TThis;

  abstract [Symbol.iterator](): IterableIterator<T>;
}
