import type { AnyIterable } from '#/utils/any-iterable-iterator.js';
import type { Comparator } from '#/utils/sort.js';
import type { ReadonlyCancellationToken } from '../utils/cancellation-token.js';
import type { IterableItemMetadata, IteratorFunction, Predicate, Reducer, TypePredicate } from '../utils/iterable-helpers/index.js';
import { all, any, assert, batch, concat, defaultIfEmpty, deferredIterable, difference, differenceMany, distinct, drain, filter, first, firstOrDefault, forEach, group, groupSingle, groupToMap, groupToSingleMap, includes, last, lastOrDefault, map, mapMany, materialize, metadata, pairwise, range, reduce, single, singleOrDefault, skip, sort, take, takeUntil, takeWhile, tap, whileSync } from '../utils/iterable-helpers/index.js';
import { isNotNullOrUndefined } from '../utils/type-guards.js';
import { AsyncEnumerable, setEnumerable } from './async-enumerable.js';
import type { EnumerableMethods } from './enumerable-methods.js';

let asyncEnumerable: undefined | (<T>(source: AnyIterable<T>) => AsyncEnumerable<T>);

export const setAsyncEnumerable: undefined | ((fn: typeof asyncEnumerable) => any) = (fn: typeof asyncEnumerable): any => (asyncEnumerable = fn);

export class Enumerable<T> implements EnumerableMethods, Iterable<T> {
  private readonly source: Iterable<T>;

  constructor(iterable: Iterable<T>) {
    this.source = iterable;
  }

  static from<T>(source: Iterable<T>): Enumerable<T> {
    return new Enumerable(source);
  }

  static fromDeferred<T>(source: () => Iterable<T>): Enumerable<T> {
    const deferred = deferredIterable(source);
    return new Enumerable(deferred);
  }

  static fromRange(fromInclusive: number, toInclusive: number): Enumerable<number> {
    const rangeIterable = range(fromInclusive, toInclusive);
    return new Enumerable(rangeIterable);
  }

  assert<TPredicate extends T>(predicate: Predicate<T> | TypePredicate<T, TPredicate>): Enumerable<TPredicate> {
    const asserted = assert(this.source, predicate);
    return new Enumerable(asserted);
  }

  all(predicate?: Predicate<T>): boolean {
    return all(this.source, predicate);
  }

  any(predicate?: Predicate<T>): boolean {
    return any(this.source, predicate);
  }

  batch(size: number): Enumerable<T[]> {
    const batched = batch(this.source, size);
    return new Enumerable(batched);
  }

  cast<TNew extends T>(): Enumerable<TNew> {
    return this as any as Enumerable<TNew>;
  }

  concat<U>(...iterables: Iterable<U>[]): Enumerable<T | U> {
    const concatted = concat<T | U>(this.source, ...iterables);
    return new Enumerable(concatted);
  }

  defaultIfEmpty<TDefault>(defaultValue: TDefault): Enumerable<T | TDefault> {
    const result = defaultIfEmpty(this.source, defaultValue);
    return new Enumerable(result);
  }

  difference(iterable: Iterable<T>, selector?: IteratorFunction<T, unknown>): Enumerable<T> {
    const result = difference(this.source, iterable, selector);
    return new Enumerable(result);
  }

  differenceMany(iterables: Iterable<T>[], selector?: IteratorFunction<T, unknown>): Enumerable<T> {
    const result = differenceMany(this.source, iterables, selector);
    return new Enumerable(result);
  }

  distinct(selector?: IteratorFunction<T, any>): Enumerable<T> {
    const result = distinct(this.source, selector);
    return new Enumerable(result);
  }

  includes(value: T): boolean {
    return includes(this.source, value);
  }

  drain(): void {
    drain(this.source);
  }

  filter<TPredicate extends T = T>(predicate: Predicate<T> | TypePredicate<T, TPredicate>): Enumerable<TPredicate> {
    const filtered = filter(this.source, predicate);
    return new Enumerable(filtered);
  }

  filterNullOrUndefined(): Enumerable<NonNullable<T>> {
    return this.filter((item): item is NonNullable<T> => isNotNullOrUndefined(item));
  }

  first<TPredicate extends T = T>(predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate {
    return first(this.source, predicate);
  }

  firstOrDefault<D, TPredicate extends T = T>(defaultValue: D, predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate | D {
    return firstOrDefault(this.source, defaultValue, predicate);
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
    return groupToMap<T, TGroup>(this.source, selector);
  }

  groupToSingleMap<TGroup>(selector: IteratorFunction<T, TGroup>): Map<TGroup, T> {
    return groupToSingleMap<T, TGroup>(this.source, selector);
  }

  tap(tapper: IteratorFunction<T, any>): Enumerable<T> {
    const iterator = tap(this.source, tapper);
    return new Enumerable(iterator);
  }

  last<TPredicate extends T = T>(predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate {
    return last(this.source, predicate);
  }

  lastOrDefault<D, TPredicate extends T = T>(defaultValue: D, predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate | D {
    return lastOrDefault(this.source, defaultValue, predicate);
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

  metadata(): Enumerable<IterableItemMetadata<T>> {
    const metadated = metadata(this.source);
    return new Enumerable(metadated);
  }

  pairwise(): Enumerable<[T, T]> {
    const pairwised = pairwise(this.source);
    return new Enumerable(pairwised);
  }

  reduce(reducer: Reducer<T, T>): T;
  reduce<U>(reducer: Reducer<T, U>, initialValue: U): U;
  reduce<U>(reducer: Reducer<T, U>, initialValue?: U): U {
    return reduce(this.source, reducer, initialValue);
  }

  single<TPredicate extends T = T>(predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate {
    return single(this.source, predicate);
  }

  singleOrDefault<D, TPredicate extends T = T>(defaultValue: D, predicate?: Predicate<T> | TypePredicate<T, TPredicate>): TPredicate | D {
    return singleOrDefault(this.source, defaultValue, predicate);
  }

  skip(count: number): Enumerable<T> {
    const skipped = skip(this.source, count);
    return new Enumerable(skipped);
  }

  sort(comparator?: Comparator<T>): Enumerable<T> {
    return Enumerable.fromDeferred(() => sort(this.source, comparator));
  }

  sortToArray(comparator?: Comparator<T>): T[] {
    return sort(this.source, comparator);
  }

  take(count: number): Enumerable<T> {
    const taken = take(this.source, count);
    return new Enumerable(taken);
  }

  takeUntil(cancellationToken: ReadonlyCancellationToken): Enumerable<T> {
    const taken = takeUntil(this.source, cancellationToken);
    return new Enumerable(taken);
  }

  takeWhile(yieldLastOnFalse: boolean, predicate: Predicate<T>): Enumerable<T> {
    const taken = takeWhile(this.source, yieldLastOnFalse, predicate);
    return new Enumerable(taken);
  }

  toArray(): T[] {
    return [...this.source];
  }

  toAsync(): AsyncEnumerable<T> {
    return (asyncEnumerable ?? AsyncEnumerable.from)(this.source);
  }

  toIterator(): Iterator<T> {
    return this.source[Symbol.iterator]();
  }

  toSet(): Set<T> {
    return new Set(this);
  }

  toSync(): this {
    return this;
  }

  while(predicate: Predicate<T>): IterableIterator<T> {
    return whileSync(this.source, predicate);
  }

  *[Symbol.iterator](): IterableIterator<T> {
    yield* this.source;
  }
}

// eslint-disable-next-line @typescript-eslint/unbound-method
setEnumerable?.(Enumerable.from);
