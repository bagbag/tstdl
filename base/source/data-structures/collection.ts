import { Enumerable } from '#/enumerable';
import { firstValueFrom } from '#/rxjs/compat';
import type { Observable, Observer, Subscribable, Unsubscribable } from 'rxjs';
import { BehaviorSubject, distinctUntilChanged, filter, map, mapTo, Subject } from 'rxjs';

export abstract class Collection<T, TThis extends Collection<T, TThis>> implements Iterable<T>, Subscribable<TThis> {
  private readonly sizeSubject: BehaviorSubject<number>;
  private readonly changeSubject: Subject<TThis>;

  /** emits size of list */
  readonly size$: Observable<number>;

  /** emits when the list is empty */
  readonly empty$: Observable<void>;

  /** emits when the list has items */
  readonly items$: Observable<void>;

  /** emits whether the list is empty */
  readonly isEmpty$: Observable<boolean>;

  /** emits whether the list has items */
  readonly hasItems$: Observable<boolean>;

  /** resolves when the list is empty */
  get $empty(): Promise<void> {
    return firstValueFrom(this.empty$);
  }

  /** resolves when the list has items */
  get $items(): Promise<void> {
    return firstValueFrom(this.items$);
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

    this.size$ = this.sizeSubject.asObservable();

    this.isEmpty$ = this.size$.pipe(map((buffered) => buffered == 0), distinctUntilChanged());
    this.hasItems$ = this.size$.pipe(map((buffered) => buffered > 0), distinctUntilChanged());

    this.empty$ = this.isEmpty$.pipe(filter((isEmpty) => isEmpty), mapTo(undefined));
    this.items$ = this.hasItems$.pipe(filter((isFull) => isFull), mapTo(undefined));
  }

  subscribe(observerOrNext: Partial<Observer<TThis>> | ((value: TThis) => void)): Unsubscribable {
    return this.changeSubject.subscribe(observerOrNext as Partial<Observer<TThis>>);
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
