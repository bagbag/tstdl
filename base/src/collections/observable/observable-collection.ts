import type { Observable } from 'rxjs';

export type ObservableCollectionChangeEvent<T> = {
  add?: T[],
  remove?: T[]
};

export interface ObservableCollection<T> extends Iterable<T> {
  readonly size: number;

  readonly size$: Observable<number>;
  readonly add$: Observable<T[]>;
  readonly remove$: Observable<T[]>;
  readonly change$: Observable<ObservableCollectionChangeEvent<T>>;

  readonly $add: Promise<T[]>;
  readonly $remove: Promise<T[]>;
  readonly $change: Promise<ObservableCollectionChangeEvent<T>>;

  add(...values: T[]): void;
  remove(...values: T[]): number;
}
