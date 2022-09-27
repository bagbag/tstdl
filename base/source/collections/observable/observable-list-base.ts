import { firstValueFrom } from '#/rxjs/compat';
import type { Observable } from 'rxjs';
import { merge, Subject } from 'rxjs';
import { map, share } from 'rxjs/operators';
import type { ObservableCollection } from './observable-collection';
import { ObservableCollectionBase } from './observable-collection-base';
import type { ObservableList, ObservableListIndexedChangeEvent, ObservableListIndexedEvent } from './observable-list';

export abstract class ObservableListBase<T, TThis extends ObservableCollection<T>> extends ObservableCollectionBase<T, TThis> implements ObservableList<T> {
  private readonly addAtSubject: Subject<ObservableListIndexedEvent<T>[]>;
  private readonly removeAtSubject: Subject<ObservableListIndexedEvent<T>[]>;

  changeAt$: Observable<ObservableListIndexedChangeEvent<T>>;

  get addAt$(): Observable<ObservableListIndexedEvent<T>[]> {
    return this.addAtSubject.asObservable();
  }

  get removeAt$(): Observable<ObservableListIndexedEvent<T>[]> {
    return this.removeAtSubject.asObservable();
  }

  get $addAt(): Promise<ObservableListIndexedEvent<T>[]> {
    return firstValueFrom(this.addAtSubject);
  }

  get $removeAt(): Promise<ObservableListIndexedEvent<T>[]> {
    return firstValueFrom(this.removeAtSubject);
  }

  get $changeAt(): Promise<ObservableListIndexedChangeEvent<T>> {
    return firstValueFrom(this.changeAt$);
  }

  constructor() {
    super();

    this.addAtSubject = new Subject();
    this.removeAtSubject = new Subject();

    this.changeAt$ = merge(
      this.addAtSubject.pipe(map((events) => ({ add: events }))),
      this.removeAtSubject.pipe(map((events) => ({ remove: events })))
    ).pipe(share());
  }

  getFirst(): T {
    return this.get(0);
  }

  getLast(): T {
    return this.get(this.length - 1);
  }

  removeFirst(): T {
    return this.removeAt(0);
  }

  removeLast(): T {
    return this.removeAt(this.length - 1);
  }

  protected override onAdd(): never {
    throw new Error(`Use ${this.onAddAt.name}.`);
  }

  protected override onRemove(): never {
    throw new Error(`Use ${this.onRemoveAt.name}.`);
  }

  protected onAddAt(events: ObservableListIndexedEvent<T>[]): void {
    const values = events.map((event) => event.value);

    super.onAdd(values);
    this.addAtSubject.next(events);
  }

  protected onRemoveAt(events: ObservableListIndexedEvent<T>[]): void {
    const values = events.map((event) => event.value);

    super.onRemove(values);
    this.removeAtSubject.next(events);
  }

  abstract get(index: number): T;
  abstract indexOf(value: T): number | undefined;
  abstract lastIndexOf(value: T): number | undefined;
  abstract set(index: number, value: T): void;
  abstract addAt(index: number, ...values: T[]): void;
  abstract removeAt(index: number): T;
  abstract removeRange(index: number, count: number): T[];
}
