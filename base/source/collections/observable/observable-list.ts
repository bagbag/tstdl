import type { Observable } from 'rxjs';
import type { List } from '../list.js';
import type { SortedList } from '../sorted-list.js';
import type { ObservableCollection } from './observable-collection.js';

export type ObservableListIndexedEvent<T> = {
  value: T,
  index: number
};

export type ObservableListIndexedChangeEvent<T> = {
  add?: ObservableListIndexedEvent<T>[],
  remove?: ObservableListIndexedEvent<T>[]
};

export interface ObservableList<T> extends List<T>, ObservableCollection<T> {
  readonly addAt$: Observable<ObservableListIndexedEvent<T>[]>;
  readonly removeAt$: Observable<ObservableListIndexedEvent<T>[]>;
  readonly changeAt$: Observable<ObservableListIndexedChangeEvent<T>>;

  readonly $addAt: Promise<ObservableListIndexedEvent<T>[]>;
  readonly $removeAt: Promise<ObservableListIndexedEvent<T>[]>;
  readonly $changeAt: Promise<ObservableListIndexedChangeEvent<T>>;
}

export interface ObservableSortedList<T extends TCompare, TCompare = T> extends SortedList<T>, ObservableList<T> { }
