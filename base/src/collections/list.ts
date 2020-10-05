import type { Collection } from './collection';

export interface List<T> extends Collection<T> {
  readonly length: number;

  indexOf(value: T): number | undefined;
  addAt(index: number, ...values: T[]): void;
  removeAt(index: number): T;
  removeRange(index: number, count: number): T[];
}
