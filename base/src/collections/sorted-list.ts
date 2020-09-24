import type { Collection } from './collection';

export interface SortedList<T> extends Collection<T> {
  readonly size: number;

  removeAt(index: number): T;
}
