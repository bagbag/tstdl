import type { Observable } from 'rxjs';
import type { Collection } from '../';

export type ObservableCollectionChangeEvent<T> = {
  add?: T[],
  remove?: T[]
};

export interface ObservableCollection<T> extends Collection<T> {
  readonly observe$: Observable<ObservableCollection<T>>;
  readonly length$: Observable<number>;
  readonly add$: Observable<T[]>;
  readonly remove$: Observable<T[]>;
  readonly change$: Observable<ObservableCollectionChangeEvent<T>>;
  readonly clear$: Observable<void>;
  readonly empty$: Observable<void>;

  readonly $observe: Promise<ObservableCollection<T>>;
  readonly $length: Promise<number>;
  readonly $add: Promise<T[]>;
  readonly $remove: Promise<T[]>;
  readonly $change: Promise<ObservableCollectionChangeEvent<T>>;
  readonly $clear: Promise<void>;
  readonly $empty: Promise<void>;

  has$(value: T): Observable<boolean>;
}
