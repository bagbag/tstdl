import type { Observable } from 'rxjs';
import { merge, Subject } from 'rxjs';
import { map, mapTo, share, shareReplay, startWith, take } from 'rxjs/operators';
import type { ObservableCollectionChangeEvent } from './observable-collection';
import type { ObservableList, ObservableListIndexedChangeEvent, ObservableListIndexedEvent } from './observable-list';

export class ObservableArray<T> implements ObservableList<T> {
  private readonly addAtSubject: Subject<ObservableListIndexedEvent<T>>;
  private readonly removeAtSubject: Subject<ObservableListIndexedEvent<T>>;
  private readonly clearSubject: Subject<void>;

  backingArray: T[];

  observe$: Observable<ObservableArray<T>>;
  size$: Observable<number>;

  add$: Observable<T>;
  remove$: Observable<T>;
  change$: Observable<ObservableCollectionChangeEvent<T>>;
  clear$: Observable<void>;

  addAt$: Observable<ObservableListIndexedEvent<T>>;
  removeAt$: Observable<ObservableListIndexedEvent<T>>;
  changeAt$: Observable<ObservableListIndexedChangeEvent<T>>;

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

  get $clear(): Promise<void> {
    return this.clear$.pipe(take(1)).toPromise();
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

  constructor() {
    this.backingArray = [];
    this.addAtSubject = new Subject();
    this.removeAtSubject = new Subject();
    this.clearSubject = new Subject();

    this.clear$ = this.clearSubject.asObservable();
    this.add$ = this.addAtSubject.pipe(map((event) => event.value));
    this.addAt$ = this.addAtSubject.asObservable();
    this.remove$ = this.removeAtSubject.pipe(map((event) => event.value));
    this.removeAt$ = this.removeAtSubject.asObservable();

    this.size$ = merge(this.add$, this.remove$).pipe(
      map(() => this.backingArray.length),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.change$ = merge(
      this.add$.pipe(map((values) => ({ add: values }))),
      this.remove$.pipe(map((values) => ({ remove: values })))
    ).pipe(share());

    this.changeAt$ = merge(
      this.addAt$.pipe(map((event) => ({ add: event }))),
      this.removeAt$.pipe(map((event) => ({ remove: event })))
    ).pipe(share());

    this.observe$ = merge(this.change$, this.clear$).pipe(startWith(undefined), mapTo(this));
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingArray[Symbol.iterator]();
  }

  clear(): void {
    this.backingArray = [];
    this.clearSubject.next();
  }

  add(value: T): void {
    this.backingArray.push(value);
    this.addAtSubject.next({ index: this.backingArray.length - 1, value });
  }

  remove(value: T): boolean {
    const index = this.backingArray.indexOf(value);

    if (index == -1) {
      return false;
    }

    this.backingArray.splice(index, 1);
    this.removeAtSubject.next({ index, value });

    return true;
  }
}
