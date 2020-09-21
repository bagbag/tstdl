import type { Observable } from 'rxjs';

export interface ObservableList<T> extends Iterable<T> {
  readonly append$: Observable<T>;
  readonly prepend$: Observable<T>;
  readonly pop$: Observable<T>;
  readonly shift$: Observable<T>;
  readonly add$: Observable<T>;
  readonly remove$: Observable<T>;
  readonly size$: Observable<number>;

  readonly size: number;
  readonly $append: Promise<T>;
  readonly $prepend: Promise<T>;
  readonly $pop: Promise<T>;
  readonly $shift: Promise<T>;
  readonly $add: Promise<T>;
  readonly $remove: Promise<T>;

  append(value: T): ObservableList<T>;
  prepend(value: T): ObservableList<T>;
  pop(): T | undefined;
  shift(): T | undefined;
}
