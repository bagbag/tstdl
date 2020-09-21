import type { Observable } from 'rxjs';

export interface ObservableCollection<T> extends Iterable<T> {
  readonly size: number;

  readonly size$: Observable<number>;
  readonly add$: Observable<T[]>;
  readonly remove$: Observable<T[]>;

  readonly $add: Promise<T[]>;
  readonly $remove: Promise<T[]>;

  add(...values: T[]): void;
  remove(...values: T[]): number;
}
