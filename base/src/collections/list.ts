import type { Collection } from './collection';

export interface List<T> extends Collection<T> {
  get(index: number): T;
  getFirst(): T;
  getLast(): T;

  set(index: number, value: T): void;
  addAt(index: number, ...values: T[]): void;

  indexOf(value: T): number | undefined;

  removeFirst(): T;
  removeLast(): T;
  removeAt(index: number): T;
  removeRange(index: number, count: number): Iterable<T>;
}
