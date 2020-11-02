import type { List } from './list';

export interface SortedList<T extends TCompare, TCompare = T> extends List<T> {
  getByComparison(value: TCompare): T | undefined;
  getRangeByComparison(from: TCompare, to: TCompare): T[];

  hasByComparison(value: TCompare): boolean;

  indexOfByComparison(value: TCompare): number | undefined;
  firstIndexOfByComparison(value: TCompare): number | undefined;
  lastIndexOfByComparison(value: TCompare): number | undefined;

  removeRangeByComparison(from: TCompare, to: TCompare): T[];
}
