import type { Observable } from 'rxjs';
import { merge, Subject } from 'rxjs';
import { map, shareReplay, take } from 'rxjs/operators';
import type { ObservableList } from './observable-list';

export class ObservableArray<T> implements ObservableList<T> {
  private readonly backingArray: T[];
  private readonly appendSubject: Subject<T>;
  private readonly prependSubject: Subject<T>;
  private readonly popSubject: Subject<T>;
  private readonly shiftSubject: Subject<T>;

  append$: Observable<T>;
  prepend$: Observable<T>;
  pop$: Observable<T>;
  shift$: Observable<T>;
  add$: Observable<T>;
  remove$: Observable<T>;
  size$: Observable<number>;

  get size(): number {
    return this.backingArray.length;
  }

  get $append(): Promise<T> {
    return this.append$.pipe(take(1)).toPromise();
  }

  get $prepend(): Promise<T> {
    return this.prepend$.pipe(take(1)).toPromise();
  }

  get $pop(): Promise<T> {
    return this.pop$.pipe(take(1)).toPromise();
  }

  get $shift(): Promise<T> {
    return this.shift$.pipe(take(1)).toPromise();
  }

  get $add(): Promise<T> {
    return this.add$.pipe(take(1)).toPromise();
  }

  get $remove(): Promise<T> {
    return this.remove$.pipe(take(1)).toPromise();
  }

  constructor() {
    this.backingArray = [];
    this.appendSubject = new Subject();

    this.append$ = this.appendSubject.asObservable();
    this.prepend$ = this.prependSubject.asObservable();

    this.pop$ = this.popSubject.asObservable();
    this.shift$ = this.shiftSubject.asObservable();

    this.add$ = merge(this.append$, this.prepend$);
    this.remove$ = merge(this.pop$, this.shift$);

    this.size$ = merge(this.add$, this.remove$).pipe(
      map(() => this.backingArray.length),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingArray[Symbol.iterator]();
  }

  append(value: T): ObservableList<T> {
    this.backingArray.push(value);
    this.appendSubject.next(value);
    return this;
  }

  prepend(value: T): ObservableList<T> {
    this.backingArray.unshift(value);
    this.prependSubject.next(value);
    return this;
  }

  pop(): T | undefined {
    const value = this.backingArray.pop();

    if (value != undefined) {
      this.popSubject.next(value);
    }

    return value;
  }

  shift(): T | undefined {
    const value = this.backingArray.shift();

    if (value != undefined) {
      this.shiftSubject.next(value);
    }

    return value;
  }
}
