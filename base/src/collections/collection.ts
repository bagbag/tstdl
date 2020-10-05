export interface Collection<T> extends Iterable<T> {
  readonly length: number;

  add(value: T): void;
  remove(value: T): boolean;
  has(value: T): boolean;
  clear(): void;
}
