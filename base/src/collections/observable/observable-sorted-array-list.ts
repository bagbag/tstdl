import type { Observable } from 'rxjs';
import { merge, Subject } from 'rxjs';
import { map, mapTo, share, shareReplay, startWith, take } from 'rxjs/operators';
import type { Comparator } from '../../utils';
import { binarySearch, binarySearchInsertionIndex, compareByValue } from '../../utils';
import type { ObservableCollectionChangeEvent } from './observable-collection';
import type { ObservableList, ObservableListIndexedChangeEvent, ObservableListIndexedEvent } from './observable-list';

export class ObservableSortedArrayList<T> implements ObservableList<T> {
  private readonly comparator: Comparator<T>;
  private readonly addAtSubject: Subject<ObservableListIndexedEvent<T>[]>;
  private readonly removeAtSubject: Subject<ObservableListIndexedEvent<T>[]>;
  private readonly clearSubject: Subject<void>;

  backingArray: T[];

  observe$: Observable<ObservableSortedArrayList<T>>;
  size$: Observable<number>;
  clear$: Observable<void>;

  add$: Observable<T[]>;
  remove$: Observable<T[]>;
  change$: Observable<ObservableCollectionChangeEvent<T>>;

  addAt$: Observable<ObservableListIndexedEvent<T>[]>;
  removeAt$: Observable<ObservableListIndexedEvent<T>[]>;
  changeAt$: Observable<ObservableListIndexedChangeEvent<T>[]>;

  get length(): number {
    return this.backingArray.length;
  }

  get $add(): Promise<T[]> {
    return this.add$.pipe(take(1)).toPromise();
  }

  get $remove(): Promise<T[]> {
    return this.remove$.pipe(take(1)).toPromise();
  }

  get $change(): Promise<ObservableCollectionChangeEvent<T>> {
    return this.change$.pipe(take(1)).toPromise();
  }

  get $addAt(): Promise<ObservableListIndexedEvent<T>[]> {
    return this.addAt$.pipe(take(1)).toPromise();
  }

  get $removeAt(): Promise<ObservableListIndexedEvent<T>[]> {
    return this.removeAt$.pipe(take(1)).toPromise();
  }

  get $changeAt(): Promise<ObservableListIndexedChangeEvent<T>[]> {
    return this.changeAt$.pipe(take(1)).toPromise();
  }

  get $clear(): Promise<void> {
    return this.clear$.pipe(take(1)).toPromise();
  }

  constructor(comparator: Comparator<T> = compareByValue) {
    this.comparator = comparator;

    this.backingArray = [];
    this.addAtSubject = new Subject();
    this.removeAtSubject = new Subject();
    this.clearSubject = new Subject();

    this.clear$ = this.clearSubject.asObservable();
    this.size$ = merge(this.add$, this.remove$).pipe(
      map(() => this.backingArray.length),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.add$ = this.addAtSubject.pipe(map((events) => events.map((event) => event.value)));
    this.remove$ = this.removeAtSubject.pipe(map((events) => events.map((event) => event.value)));
    this.change$ = merge(
      this.add$.pipe(map((values) => ({ add: values }))),
      this.remove$.pipe(map((values) => ({ remove: values }))),
      share()
    );

    this.addAt$ = this.addAtSubject.asObservable();
    this.removeAt$ = this.removeAtSubject.asObservable();
    this.changeAt$ = merge(
      this.addAt$.pipe(map((event) => ({ add: event }))),
      this.removeAt$.pipe(map((event) => ({ remove: event }))),
      share()
    );

    this.observe$ = merge(this.change$, this.clear$).pipe(startWith(undefined), mapTo(this));
  }

  get(index: number): T {
    if ((index < 0) || (index > (this.backingArray.length - 1))) {
      throw new Error('index out of bounds');
    }

    return this.backingArray[index];
  }

  getFirst(): T {
    return this.get(0);
  }

  getLast(): T {
    return this.get(this.length - 1);
  }

  indexOf(value: T): number | undefined {
    const index = binarySearch(this.backingArray, value);
    return (index == -1) ? undefined : index;
  }

  addAt(index: number, ...values: T[]): void {
    this.backingArray.splice(index, 0, ...values);

    const events: ObservableListIndexedEvent<T>[] = values.map((value, i) => ({ index: index + i, value }));
    this.addAtSubject.next(events);
  }

  removeFirst(): T {
    return this.removeAt(0);
  }

  removeLast(): T {
    return this.removeAt(this.length - 1);
  }

  removeAt(index: number): T {
    if ((index < 0) || (index > (this.backingArray.length - 1))) {
      throw new Error('index out of bounds');
    }

    const value = this.backingArray.splice(index, 1)[0];
    this.removeAtSubject.next([{ index, value }]);

    return value;
  }

  removeRange(index: number, count: number): Iterable<T> {
    if ((index < 0) || (index > (this.backingArray.length - 1))) {
      throw new Error('index out of bounds');
    }

    const values = this.backingArray.splice(index, count);

    const events: ObservableListIndexedEvent<T>[] = values.map((value, i) => ({ index: index + i, value }));
    this.removeAtSubject.next(events);

    return values;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingArray[Symbol.iterator]();
  }

  clear(): void {
    this.backingArray = [];
    this.clearSubject.next();
  }

  add(value: T): void {
    const index = binarySearchInsertionIndex(this.backingArray, value, this.comparator);
    this.backingArray.splice(index, 0, value);

    this.addAtSubject.next([{ value, index }]);
  }

  has(value: T): boolean {
    const index = binarySearch(this.backingArray, value, this.comparator);
    return index != undefined;
  }

  remove(value: T): boolean {
    const index = binarySearch(this.backingArray, value, this.comparator);

    if (index == undefined) {
      return false;
    }

    this.backingArray.splice(index, 1);
    this.removeAtSubject.next([{ value, index }]);

    return true;
  }

  findFirstIndexEqualOrLargerThan(value: T): number | undefined {
    let index = binarySearchInsertionIndex(this.backingArray, value, this.comparator);

    while ((index > 0) && (this.comparator(this.backingArray[index - 1], value) == 0)) {
      index--;
    }

    if (index > this.backingArray.length - 1) {
      return undefined;
    }

    return index;
  }

  findLastIndexEqualOrSmallerThan(value: T): number | undefined {
    let index = binarySearchInsertionIndex(this.backingArray, value, this.comparator) - 1;

    while ((index < this.backingArray.length - 1) && (this.comparator(this.backingArray[index + 1], value) == 0)) {
      index++;
    }

    if (index < 0) {
      return undefined;
    }

    return index;
  }
}
