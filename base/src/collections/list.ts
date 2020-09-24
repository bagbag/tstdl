import type { Collection } from './collection';

export interface List<T> extends Collection<T> {
  readonly size: number;

  addAt(index: number, ...values: T[]): void;
  removeAt(index: number, count: number): void;
}
