export interface Collection<T> extends Iterable<T> {
  readonly length: number;

  add(value: T): void;
  addMany(values: T[]): void;
  remove(value: T): boolean;
  removeMany(values: T[]): number;
  has(value: T): boolean;
  clear(): void;
}
