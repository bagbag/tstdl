import type { Observable } from 'rxjs';
import type { SortedList } from '../sorted-list';
import type { ObservableCollection } from './observable-collection';

export type ObservableSortedListRemoveAtEvent<T> = {
  index: number,
  value: T
};

export interface ObservableSortedList<T> extends SortedList<T>, ObservableCollection<T> {
  readonly removeAt$: Observable<ObservableSortedListRemoveAtEvent<T>>;

  readonly $removeAt: Promise<ObservableSortedListRemoveAtEvent<T>>;
}
