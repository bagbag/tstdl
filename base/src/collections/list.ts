import type { Collection } from './collection';

export interface List<T> extends Collection<T> {
  get(index: number): T;
  getFirst(): T;
  getLast(): T;

  indexOf(value: T): number | undefined;

  addAt(index: number, ...values: T[]): void;

  removeFirst(): T;
  removeLast(): T;
  removeAt(index: number): T;
  removeRange(index: number, count: number): Iterable<T>;
}
