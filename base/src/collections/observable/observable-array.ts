import type { Observable } from 'rxjs';
import { merge, Subject } from 'rxjs';
import { map, share, shareReplay, take } from 'rxjs/operators';
import type { ObservableCollection, ObservableCollectionChangeEvent } from './observable-collection';

export class ObservableArray<T> implements ObservableCollection<T> {
  private readonly backingArray: T[];
  private readonly addSubject: Subject<T[]>;
  private readonly removeSubject: Subject<T[]>;

  size$: Observable<number>;
  add$: Observable<T[]>;
  remove$: Observable<T[]>;
  change$: Observable<ObservableCollectionChangeEvent<T>>;

  get size(): number {
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

  constructor() {
    this.backingArray = [];
    this.addSubject = new Subject();

    this.add$ = this.addSubject.asObservable();
    this.remove$ = this.removeSubject.asObservable();

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

  add(...values: T[]): void {
    this.backingArray.push(...values);
    this.addSubject.next(values);
  }

  remove(...values: T[]): number {
    let count = 0;

    for (const value of values) {
      const index = this.backingArray.indexOf(value);

      if (index == -1) {
        continue;
      }

      this.backingArray.splice(index, 1);
      count++;
    }

    return count;
  }
}
