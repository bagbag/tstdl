import type { Comparator } from '../utils';
import type { IteratorFunction, Predicate, Reducer, TypePredicate } from '../utils/iterable-helpers';
import { any, assert, batch, concat, defaultIfEmpty, distinct, drain, filter, first, forEach, group, groupSingle, groupToMap, groupToSingleMap, intercept, last, map, mapMany, materialize, pairwise, range, reduce, single, skip, sort, take, takeWhile, whileSync } from '../utils/iterable-helpers';
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

  assert<TPredicate extends T>(predicate: Predicate<T> | TypePredicate<T, TPredicate>): Enumerable<TPredicate> {
    const asserted = assert(this.source, predicate);
    return new Enumerable(asserted);
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

  defaultIfEmpty<TDefault>(defaultValue: TDefault): Enumerable<T | TDefault> {
    const result = defaultIfEmpty(this.source, defaultValue);
    return new Enumerable(result);
  }

  distinct(selector?: IteratorFunction<T, any>): Enumerable<T> {
    const result = distinct(this.source, selector);
    return new Enumerable(result);
  }

  drain(): void {
    drain(this.source);
  }

  filter<TPredicate extends T = T>(predicate: Predicate<T> | TypePredicate<T, TPredicate>): Enumerable<TPredicate> {
    const filtered = filter(this.source, predicate);
    return new Enumerable(filtered);
  }

  first<TPredicate extends T = T>(predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate {
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
    const grouped = group(this.source, selector);
    return new Enumerable(grouped);
  }

  groupSingle<TGroup>(selector: IteratorFunction<T, TGroup>): Enumerable<[TGroup, T]> {
    const grouped = groupSingle(this.source, selector);
    return new Enumerable(grouped);
  }

  groupToMap<TGroup>(selector: IteratorFunction<T, TGroup>): Map<TGroup, T[]> {
    const grouped = groupToMap<T, TGroup>(this.source, selector);
    return grouped;
  }

  groupToSingleMap<TGroup>(selector: IteratorFunction<T, TGroup>): Map<TGroup, T> {
    const grouped = groupToSingleMap<T, TGroup>(this.source, selector);
    return grouped;
  }

  intercept(func: IteratorFunction<T, void>): Enumerable<T> {
    const iterator = intercept(this.source, func);
    return new Enumerable(iterator);
  }

  last<TPredicate extends T = T>(predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate {
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

  pairwise(): Enumerable<[T, T]> {
    const pairwised = pairwise(this.source);
    return new Enumerable(pairwised);
  }

  reduce(reducer: Reducer<T, T>): T;
  reduce<U>(reducer: Reducer<T, U>, initialValue: U): U;
  reduce<U>(reducer: Reducer<T, U>, initialValue?: U): U {
    const result = reduce(this.source, reducer, initialValue);
    return result;
  }

  single<TPredicate extends T = T>(predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate {
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

  toAsync(): AsyncEnumerable<T> {
    return AsyncEnumerable.from(this.source);
  }

  toIterator(): Iterator<T> {
    const iterator = this.source[Symbol.iterator]();
    return iterator;
  }

  toSync(): Enumerable<T> {
    return this;
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
