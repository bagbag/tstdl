import type { Observable } from 'rxjs';
import { firstValueFrom, merge, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, mapTo, share, shareReplay, skip, startWith } from 'rxjs/operators';
import type { ObservableCollection } from './observable-collection';

export type ObservableCollectionChangeEvent<T> = {
  add?: T[],
  remove?: T[]
};

export abstract class ObservableCollectionBase<T, TThis extends ObservableCollection<T>> implements ObservableCollection<T> {
  private readonly clearSubject: Subject<void>;
  private readonly addSubject: Subject<T[]>;
  private readonly removeSubject: Subject<T[]>;

  readonly change$: Observable<ObservableCollectionChangeEvent<T>>;
  readonly observe$: Observable<TThis>;
  readonly length$: Observable<number>;
  readonly empty$: Observable<void>;

  protected abstract readonly self: TThis;

  abstract readonly length: number;

  get clear$(): Observable<void> {
    return this.clearSubject.asObservable();
  }

  get add$(): Observable<T[]> {
    return this.addSubject.asObservable();
  }

  get remove$(): Observable<T[]> {
    return this.removeSubject.asObservable();
  }

  get $observe(): Promise<TThis> {
    return firstValueFrom(this.observe$.pipe(skip(1)));
  }

  get $length(): Promise<number> {
    return firstValueFrom(this.length$.pipe(skip(1)));
  }

  get $add(): Promise<T[]> {
    return firstValueFrom(this.add$);
  }

  get $remove(): Promise<T[]> {
    return firstValueFrom(this.remove$);
  }

  get $change(): Promise<ObservableCollectionChangeEvent<T>> {
    return firstValueFrom(this.change$);
  }

  get $clear(): Promise<void> {
    return firstValueFrom(this.clear$);
  }

  get $empty(): Promise<void> {
    return firstValueFrom(this.empty$);
  }

  constructor() {
    this.addSubject = new Subject();
    this.removeSubject = new Subject();
    this.clearSubject = new Subject();

    this.change$ = merge(
      this.addSubject.pipe(map((values) => ({ add: values }))),
      this.removeSubject.pipe(map((values) => ({ remove: values })))
    ).pipe(share());

    this.observe$ = merge(this.change$, this.clear$).pipe(
      startWith(undefined),
      map(() => this.self),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.length$ = this.observe$.pipe(
      map((collection) => collection.length),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.empty$ = this.length$.pipe(
      filter((length) => length == 0),
      mapTo(undefined)
    );
  }

  has$(value: T): Observable<boolean> {
    return this.observe$.pipe(
      map(() => this.has(value)),
      distinctUntilChanged()
    );
  }

  protected onAdd(values: T[]): void {
    this.addSubject.next(values);
  }

  protected onRemove(values: T[]): void {
    this.removeSubject.next(values);
  }

  protected onClear(): void {
    this.clearSubject.next();
  }

  abstract add(value: T): void;

  abstract addMany(values: T[]): void;

  abstract remove(value: T): boolean;

  abstract removeMany(values: T[]): number;

  abstract has(value: T): boolean;

  abstract clear(): void;

  abstract [Symbol.iterator](): Iterator<T>;
}
