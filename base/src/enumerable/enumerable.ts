import type { Comparator, IteratorFunction, Predicate, Reducer } from '../utils';
import { any, batch, concat, distinct, drain, filter, first, forEach, groupToMap, intercept, last, map, mapMany, materialize, range, reduce, single, skip, sort, take, takeWhile, whileSync } from '../utils';
import { AsyncEnumerable } from './async-enumerable';
import type { EnumerableMethods } from './enumerable-methods';

export class Enumerable<T> implements EnumerableMethods, IterableIterator<T> {
  private readonly source: Iterable<T>;

  private iterator: Iterator<T> | undefined;

  constructor(iterable: Iterable<T>) {
    this.source = iterable;
    this.iterator = undefined;
  }

  static from<T>(iterable: Iterable<T>): Enumerable<T> {
    return new Enumerable(iterable);
  }

  static fromRange(fromInclusive: number, toInclusive: number): Enumerable<number> {
    const rangeIterable = range(fromInclusive, toInclusive);
    return new Enumerable(rangeIterable);
  }

  any(predicate?: Predicate<T>): boolean {
    const result = any(this.source, predicate);
    return result;
  }

  batch(size: number): Enumerable<T[]> {
    const batched = batch(this.source, size);
    return new Enumerable(batched);
  }

  cast<TNew extends T>(): Enumerable<TNew> {
    return this as any as Enumerable<TNew>;
  }

  concat<TOther>(iterable: Iterable<TOther>): Enumerable<T | TOther> {
    const concatted = concat(this.source, iterable);
    return new Enumerable(concatted);
  }

  distinct(selector?: IteratorFunction<T, any>): Enumerable<T> {
    const result = distinct(this.source, selector);
    return new Enumerable(result);
  }

  drain(): void {
    drain(this.source);
  }

  filter<TNew extends T = T>(predicate: Predicate<T>): Enumerable<TNew> {
    const filtered = filter<T, TNew>(this.source, predicate);
    return new Enumerable(filtered);
  }

  first(predicate?: Predicate<T>): T {
    const result = first(this.source, predicate);
    return result;
  }

  forEach(func: IteratorFunction<T, void>): void {
    forEach(this.source, func);
  }

  forceCast<TNew>(): Enumerable<TNew> {
    return this as any as Enumerable<TNew>;
  }

  group<TGroup>(selector: IteratorFunction<T, TGroup>): Enumerable<[TGroup, T[]]> {
    const source = this.source;

    const iterable: Iterable<[TGroup, T[]]> = {
      [Symbol.iterator](): Iterator<[TGroup, T[]]> {
        return groupToMap(source, selector)[Symbol.iterator]();
      }
    };

    return new Enumerable(iterable);
  }

  groupToMap<TGroup>(selector: IteratorFunction<T, TGroup>): Map<TGroup, T[]> {
    const grouped = groupToMap<T, TGroup>(this.source, selector);
    return grouped;
  }

  intercept(func: IteratorFunction<T, void>): Enumerable<T> {
    const iterator = intercept(this.source, func);
    return new Enumerable(iterator);
  }

  last(predicate?: Predicate<T>): T {
    return last(this.source, predicate);
  }

  map<TOut>(mapper: IteratorFunction<T, TOut>): Enumerable<TOut> {
    const mapped = map(this.source, mapper);
    return new Enumerable(mapped);
  }

  mapMany<TOut>(mapper: IteratorFunction<T, Iterable<TOut>>): Enumerable<TOut> {
    const result = mapMany(this.source, mapper);
    return new Enumerable(result);
  }

  materialize(): Enumerable<T> {
    const materialized = materialize(this.source);
    return new Enumerable(materialized);
  }

  toAsync(): AsyncEnumerable<T> {
    return AsyncEnumerable.from(this.source);
  }

  toSync(): Enumerable<T> {
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

  skip(count: number): Enumerable<T> {
    const skipped = skip(this.source, count);
    return new Enumerable(skipped);
  }

  sort(comparator?: Comparator<T>): Enumerable<T> {
    const sorted = sort(this.source, comparator);
    return new Enumerable(sorted);
  }

  take(count: number): Enumerable<T> {
    const taken = take(this.source, count);
    return new Enumerable(taken);
  }

  takeWhile(yieldLastOnFalse: boolean, predicate: Predicate<T>): Enumerable<T> {
    const skipped = takeWhile(this.source, yieldLastOnFalse, predicate);
    return new Enumerable(skipped);
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
