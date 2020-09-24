import type { Observable } from 'rxjs';
import { merge, Subject } from 'rxjs';
import { map, share, shareReplay, take } from 'rxjs/operators';
import type { Comparator } from '../../utils';
import { binarySearch, binarySearchInsertionIndex, compareByValue } from '../../utils';
import type { ObservableCollectionChangeEvent } from './observable-collection';
import type { ObservableSortedList, ObservableSortedListRemoveAtEvent } from './observable-sorted-list';

export class ObservableSortedArrayList<T> implements ObservableSortedList<T> {
  private readonly comparator: Comparator<T>;
  private readonly addSubject: Subject<T>;
  private readonly removeAtSubject: Subject<ObservableSortedListRemoveAtEvent<T>>;
  private readonly clearSubject: Subject<void>;

  private backingArray: T[];

  size$: Observable<number>;
  add$: Observable<T>;
  remove$: Observable<T>;
  change$: Observable<ObservableCollectionChangeEvent<T>>;
  removeAt$: Observable<ObservableSortedListRemoveAtEvent<T>>;
  clear$: Observable<void>;

  get size(): number {
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

  get $removeAt(): Promise<ObservableSortedListRemoveAtEvent<T>> {
    return this.removeAt$.pipe(take(1)).toPromise();
  }

  get $clear(): Promise<void> {
    return this.clear$.pipe(take(1)).toPromise();
  }

  constructor(comparator: Comparator<T> = compareByValue) {
    this.comparator = comparator;

    this.backingArray = [];
    this.addSubject = new Subject();
    this.removeAtSubject = new Subject();

    this.add$ = this.addSubject.asObservable();
    this.remove$ = this.removeAtSubject.pipe(map((event) => event.value));
    this.removeAt$ = this.removeAtSubject.asObservable();
    this.clear$ = this.clearSubject.asObservable();

    this.size$ = merge(this.add$, this.remove$).pipe(
      map(() => this.backingArray.length),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.change$ = merge(
      this.add$.pipe(map((values) => ({ add: values }))),
      this.remove$.pipe(map((values) => ({ remove: values }))),
      share()
    );
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingArray[Symbol.iterator]();
  }

  clear(): void {
    this.backingArray = [];
    this.clearSubject.next();
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

  get(index: number): T {
    return this.backingArray[index];
  }

  add(value: T): void {
    const insertionIndex = binarySearchInsertionIndex(this.backingArray, value, this.comparator);
    this.backingArray.splice(insertionIndex, 0, value);

    this.addSubject.next(value);
  }

  remove(value: T): boolean {
    const index = binarySearch(this.backingArray, value, this.comparator);

    if (index == undefined) {
      return false;
    }

    this.backingArray.splice(index, 1);
    this.removeAtSubject.next({ index, value });

    return true;
  }

  removeAt(index: number): T {
    if (index < this.backingArray.length - 1) {
      throw new Error('out of bounds');
    }

    const [value] = this.backingArray.splice(index, 1);

    this.removeAtSubject.next({ index, value });

    return value;
  }
}
