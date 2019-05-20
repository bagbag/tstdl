import { any, batch, Comparator, drain, filter, first, forEach, group, intercept, IteratorFunction, last, map, mapMany, Predicate, range, reduce, Reducer, single, skip, skipWhile, sort, take, takeWhile } from '../utils';
import { whileSync } from '../utils/iterable-helpers/while';
import { AsyncEnumerable } from './async-enumerable';
import { EnumerableMethods } from './enumerable-methods';

export class Enumerable<T> implements EnumerableMethods, IterableIterator<T> {
  private readonly source: Iterable<T>;

  private iterator: Iterator<T> | undefined;

  static from<T>(iterable: Iterable<T>): Enumerable<T> {
    return new Enumerable(iterable);
  }

  static fromRange(fromInclusive: number, toInclusive: number): Enumerable<number> {
    const rangeIterable = range(fromInclusive, toInclusive);
    return new Enumerable(rangeIterable);
  }

  constructor(iterable: Iterable<T>) {
    this.source = iterable;
    this.iterator = undefined;
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

  drain(): void {
    drain(this.source);
  }

  filter(predicate: Predicate<T>): Enumerable<T> {
    const filtered = filter(this.source, predicate);
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
    const grouped = group<T, TGroup>(this.source, selector);
    return new Enumerable(grouped);
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

  skipWhile(predicate: Predicate<T>): Enumerable<T> {
    const skipped = skipWhile(this.source, predicate);
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

  takeWhile(breakWhenFalse: boolean, predicate: Predicate<T>): Enumerable<T> {
    const skipped = takeWhile(this.source, breakWhenFalse, predicate);
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
