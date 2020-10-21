import type { Observable } from 'rxjs';
import type { List } from '../list';
import type { ObservableCollection } from './observable-collection';

export type ObservableListIndexedEvent<T> = {
  value: T,
  index: number
};

export type ObservableListIndexedChangeEvent<T> = {
  add?: ObservableListIndexedEvent<T>,
  remove?: ObservableListIndexedEvent<T>
};

export interface ObservableList<T> extends List<T>, ObservableCollection<T> {
  readonly addAt$: Observable<ObservableListIndexedEvent<T>[]>;
  readonly removeAt$: Observable<ObservableListIndexedEvent<T>[]>;
  readonly changeAt$: Observable<ObservableListIndexedChangeEvent<T>[]>;

  readonly $addAt: Promise<ObservableListIndexedEvent<T>[]>;
  readonly $removeAt: Promise<ObservableListIndexedEvent<T>[]>;
  readonly $changeAt: Promise<ObservableListIndexedChangeEvent<T>[]>;
}
