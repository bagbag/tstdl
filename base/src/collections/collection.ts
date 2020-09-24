export interface Collection<T> extends Iterable<T> {
  readonly size: number;

  add(value: T): void;
  remove(value: T): boolean;
  clear(): void;
}
