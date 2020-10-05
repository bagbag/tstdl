import type { Collection } from './collection';

export interface SortedList<T> extends Collection<T> {
  readonly length: number;

  indexOf(value: T): number | undefined;
  removeAt(index: number): T;
  removeRange(index: number, count: number): Iterable<T>;
  removeRangeByComparison(from: T, to: T): Iterable<T>;
}
