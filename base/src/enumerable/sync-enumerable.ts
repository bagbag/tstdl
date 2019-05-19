import { any, batch, Comparator, drain, filter, first, forEach, group, intercept, IteratorFunction, map, mapMany, Predicate, range, reduce, Reducer, single, skip, sort, take } from '../utils';
import { whileSync } from '../utils/iterable-helpers/while';
import { AsyncEnumerable } from './async-enumerable';
import { EnumerableMethods } from './enumerable-methods';

export class SyncEnumerable<T> implements EnumerableMethods, IterableIterator<T> {
  private readonly source: Iterable<T>;

  private iterator: Iterator<T> | undefined;

  static from<T>(iterable: Iterable<T>): SyncEnumerable<T> {
    return new SyncEnumerable(iterable);
  }

  static fromRange(fromInclusive: number, toInclusive: number): SyncEnumerable<number> {
    const rangeIterable = range(fromInclusive, toInclusive);
    return new SyncEnumerable(rangeIterable);
  }

  constructor(iterable: Iterable<T>) {
    this.source = iterable;
    this.iterator = undefined;
  }

  any(predicate?: Predicate<T>): boolean {
    const result = any(this.source, predicate);
    return result;
  }

  batch(size: number): SyncEnumerable<T[]> {
    const batched = batch(this.source, size);
    return new SyncEnumerable(batched);
  }

  cast<TNew extends T>(): SyncEnumerable<TNew> {
    return this as any as SyncEnumerable<TNew>;
  }

  drain(): void {
    drain(this.source);
  }

  filter(predicate: Predicate<T>): SyncEnumerable<T> {
    const filtered = filter(this.source, predicate);
    return new SyncEnumerable(filtered);
  }

  first(predicate?: Predicate<T>): T {
    const result = first(this.source, predicate);
    return result;
  }

  forEach(func: IteratorFunction<T, void>): void {
    forEach(this.source, func);
  }

  forceCast<TNew>(): SyncEnumerable<TNew> {
    return this as any as SyncEnumerable<TNew>;
  }

  group<TGroup>(selector: IteratorFunction<T, TGroup>): SyncEnumerable<[TGroup, T[]]> {
    const grouped = group<T, TGroup>(this.source, selector);
    return new SyncEnumerable(grouped);
  }

  intercept(func: IteratorFunction<T, void>): SyncEnumerable<T> {
    const iterator = intercept(this.source, func);
    return new SyncEnumerable(iterator);
  }

  last(): T {

  }

  map<TOut>(mapper: IteratorFunction<T, TOut>): SyncEnumerable<TOut> {
    const mapped = map(this.source, mapper);
    return new SyncEnumerable(mapped);
  }

  mapMany<TOut>(mapper: IteratorFunction<T, Iterable<TOut>>): SyncEnumerable<TOut> {
    const result = mapMany(this.source, mapper);
    return new SyncEnumerable(result);
  }

  toAsync(): AsyncEnumerable<T> {
    return AsyncEnumerable.from(this.source);
  }

  toSync(): SyncEnumerable<T> {
    return this;
  }

  reduce(reducer: Reducer<T, T>): T;
  reduce<U>(reducer: Reducer<T, U>, initialValue: U): U;
  reduce<U>(reducer: Reducer<T, U>, initialValue?: U): U {
    const result = reduce(this.source, reducer, initialValue);
    return result;
  }

  single(predicate?: Predicate<T>): T {
    const result = single(this.source, predicate);
    return result;
  }

  skip(count: number): SyncEnumerable<T> {
    const skipped = skip(this.source, count);
    return new SyncEnumerable(skipped);
  }

  sort(comparator?: Comparator<T>): SyncEnumerable<T> {
    const sorted = sort(this.source, comparator);
    return new SyncEnumerable(sorted);
  }

  take(count: number): SyncEnumerable<T> {
    const taken = take(this.source, count);
    return new SyncEnumerable(taken);
  }

  toArray(): T[] {
    const array = [...this.source];
    return array;
  }

  toIterator(): Iterator<T> {
    const iterator = this.source[Symbol.iterator]();
    return iterator;
  }

  while(predicate: Predicate<T>): IterableIterator<T> {
    return whileSync(this.source, predicate);
  }

  next(value?: any): IteratorResult<T> {
    if (this.iterator == undefined) {
      this.iterator = this.toIterator();
    }

    return this.iterator.next(value);
  }

  *[Symbol.iterator](): IterableIterator<T> {
    yield* this.source;
  }
}
