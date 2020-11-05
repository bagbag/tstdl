import type { List } from './list';

export interface SortedList<T extends TComparator, TComparator = T> extends List<T> {
  getByComparison(value: TComparator): T | undefined;
  getRangeByComparison(from: TComparator, to: TComparator): T[];

  hasByComparison(value: TComparator): boolean;

  indexOfByComparison(value: TComparator): number | undefined;
  firstIndexOfByComparison(value: TComparator): number | undefined;
  lastIndexOfByComparison(value: TComparator): number | undefined;

  removeRangeByComparison(from: TComparator, to: TComparator): T[];
}
