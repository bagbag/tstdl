import type { Observable } from 'rxjs';
import type { Collection } from '../';

export type ObservableCollectionChangeEvent<T> = {
  add?: T[],
  remove?: T[]
};

export interface ObservableCollection<T> extends Collection<T> {
  readonly observe$: Observable<ObservableCollection<T>>;
  readonly size$: Observable<number>;
  readonly add$: Observable<T[]>;
  readonly remove$: Observable<T[]>;
  readonly change$: Observable<ObservableCollectionChangeEvent<T>>;
  readonly clear$: Observable<void>;

  readonly $add: Promise<T[]>;
  readonly $remove: Promise<T[]>;
  readonly $change: Promise<ObservableCollectionChangeEvent<T>>;
  readonly $clear: Promise<void>;
}
