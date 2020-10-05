import type { Observable } from 'rxjs';
import { merge, Subject } from 'rxjs';
import { map, mapTo, share, shareReplay, startWith, take } from 'rxjs/operators';
import type { Comparator } from '../../utils';
import { binarySearch, binarySearchInsertionIndex, compareByValue } from '../../utils';
import type { ObservableCollectionChangeEvent } from './observable-collection';
import type { ObservableList, ObservableListIndexedChangeEvent, ObservableListIndexedEvent } from './observable-list';

export class ObservableSortedArrayList<T> implements ObservableList<T> {
  private readonly comparator: Comparator<T>;
  private readonly addAtSubject: Subject<ObservableListIndexedEvent<T>>;
  private readonly removeAtSubject: Subject<ObservableListIndexedEvent<T>>;
  private readonly clearSubject: Subject<void>;

  backingArray: T[];

  observe$: Observable<ObservableSortedArrayList<T>>;
  size$: Observable<number>;
  clear$: Observable<void>;

  add$: Observable<T>;
  remove$: Observable<T>;
  change$: Observable<ObservableCollectionChangeEvent<T>>;

  addAt$: Observable<ObservableListIndexedEvent<T>>;
  removeAt$: Observable<ObservableListIndexedEvent<T>>;
  changeAt$: Observable<ObservableListIndexedChangeEvent<T>>;

  get length(): number {
    return this.backingArray.length;
  }

  get $add(): Promise<T> {
    return this.add$.pipe(take(1)).toPromise();
  }

  get $remove(): Promise<T> {
    return this.remove$.pipe(take(1)).toPromise();
  }

  get $change(): Promise<ObservableCollectionChangeEvent<T>> {
    return this.change$.pipe(take(1)).toPromise();
  }

  get $addAt(): Promise<ObservableListIndexedEvent<T>> {
    return this.addAt$.pipe(take(1)).toPromise();
  }

  get $removeAt(): Promise<ObservableListIndexedEvent<T>> {
    return this.removeAt$.pipe(take(1)).toPromise();
  }

  get $changeAt(): Promise<ObservableListIndexedChangeEvent<T>> {
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

    this.add$ = this.addAtSubject.pipe(map((event) => event.value));
    this.remove$ = this.removeAtSubject.pipe(map((event) => event.value));
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

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingArray[Symbol.iterator]();
  }

  clear(): void {
    this.backingArray = [];
    this.clearSubject.next();
  }

  get(index: number): T {
    return this.backingArray[index];
  }

  add(value: T): void {
    const index = binarySearchInsertionIndex(this.backingArray, value, this.comparator);
    this.backingArray.splice(index, 0, value);

    this.addAtSubject.next({ value, index });
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
    this.removeAtSubject.next({ value, index });

    return true;
  }

  removeAt(index: number): T {
    if (index < this.backingArray.length - 1) {
      throw new Error('out of bounds');
    }

    const [value] = this.backingArray.splice(index, 1);

    this.removeAtSubject.next({ value, index });

    return value;
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
