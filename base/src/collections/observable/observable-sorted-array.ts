import type { Observable } from 'rxjs';
import { merge, Subject } from 'rxjs';
import { map, shareReplay, take } from 'rxjs/operators';
import type { Comparator } from '../../utils';
import { binarySearch, binarySearchInsertionIndex, compareByValue } from '../../utils';
import type { ObservableCollection } from './observable-collection';

export class ObservableSortedArray<T> implements ObservableCollection<T> {
  private readonly comparator: Comparator<T>;
  private readonly backingArray: T[];
  private readonly addSubject: Subject<T[]>;
  private readonly removeSubject: Subject<T[]>;

  size$: Observable<number>;
  add$: Observable<T[]>;
  remove$: Observable<T[]>;

  get size(): number {
    return this.backingArray.length;
  }

  get $add(): Promise<T[]> {
    return this.add$.pipe(take(1)).toPromise();
  }

  get $remove(): Promise<T[]> {
    return this.remove$.pipe(take(1)).toPromise();
  }

  constructor(comparator: Comparator<T> = compareByValue) {
    this.comparator = comparator;

    this.backingArray = [];
    this.addSubject = new Subject();
    this.removeSubject = new Subject();

    this.add$ = this.addSubject.asObservable();
    this.remove$ = this.removeSubject.asObservable();

    this.size$ = merge(this.add$, this.remove$).pipe(
      map(() => this.backingArray.length),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingArray[Symbol.iterator]();
  }

  add(...values: T[]): void {
    for (const value of values) {
      const insertionIndex = binarySearchInsertionIndex(this.backingArray, value, this.comparator);
      this.backingArray.splice(insertionIndex, 0, value);
    }

    this.addSubject.next(values);
  }

  remove(...values: T[]): number {
    let count = 0;

    for (const value of values) {
      const index = binarySearch(this.backingArray, value, this.comparator);

      if (index == undefined) {
        continue;
      }

      this.backingArray.splice(index, 1);
      count++;
    }

    return count;
  }
}
