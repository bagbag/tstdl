import type { List } from './list';

export interface SortedList<T> extends List<T> {
  removeRangeByComparison(from: T, to: T): T[];
}
