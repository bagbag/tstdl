import type { AnyIterable } from '#/utils/any-iterable-iterator';
import { isAnyIterable } from '#/utils/any-iterable-iterator';
import type { ReadonlyCancellationToken } from '#/utils/cancellation-token';
import type { AsyncComparator } from '#/utils/sort';
import { isNotNullOrUndefined } from '#/utils/type-guards';
import type { Observable } from 'rxjs';
import type { AsyncIteratorFunction, AsyncPredicate, AsyncReducer, AsyncRetryPredicate, ParallelizableIteratorFunction, ParallelizablePredicate, ThrottleFunction } from '../utils/async-iterable-helpers';
import { allAsync, anyAsync, assertAsync, batchAsync, bufferAsync, concatAsync, defaultIfEmptyAsync, deferredAsyncIterable, differenceAsync, differenceManyAsync, distinctAsync, drainAsync, filterAsync, firstAsync, firstOrDefaultAsync, forEachAsync, groupAsync, groupSingleAsync, groupToMapAsync, groupToSingleMapAsync, interruptEveryAsync, interruptPerSecondAsync, isAsyncIterableIterator, iterableToAsyncIterableIterator, iterableToAsyncIterator, lastAsync, lastOrDefaultAsync, mapAsync, mapManyAsync, materializeAsync, metadataAsync, multiplexAsync, pairwiseAsync, reduceAsync, retryAsync, singleAsync, singleOrDefaultAsync, skipAsync, sortAsync, takeAsync, takeUntilAsync, takeWhileAsync, tapAsync, throttle, toArrayAsync, toSync, whileAsync } from '../utils/async-iterable-helpers';
import { observableAsyncIterable } from '../utils/async-iterable-helpers/observable-iterable';
import { parallelFilter, parallelForEach, parallelGroup, parallelMap, parallelTap } from '../utils/async-iterable-helpers/parallel';
import type { IterableItemMetadata, TypePredicate } from '../utils/iterable-helpers';
import { range } from '../utils/iterable-helpers';
import { Enumerable, setAsyncEnumerable } from './enumerable';
import type { EnumerableMethods } from './enumerable-methods';

let enumerable: undefined | (<T>(source: Iterable<T>) => Enumerable<T>);

export const setEnumerable: undefined | ((fn: typeof enumerable) => any) = (fn: typeof enumerable): any => (enumerable = fn);

export class AsyncEnumerable<T> implements EnumerableMethods, AsyncIterable<T> {
  private readonly source: AnyIterable<T>;

  constructor(source: AnyIterable<T>) {
    this.source = source;
  }

  static from<T>(source: AnyIterable<T>): AsyncEnumerable<T> {
    return new AsyncEnumerable(source);
  }

  static fromDeferred<T>(source: () => AnyIterable<T> | Promise<AnyIterable<T>>): AsyncEnumerable<T> {
    const deferred = deferredAsyncIterable(source);
    return new AsyncEnumerable(deferred);
  }

  static fromObservable<T>(observable: Observable<T>): AsyncEnumerable<T> {
    const iterable = observableAsyncIterable(observable);
    return new AsyncEnumerable(iterable);
  }

  static fromRange(fromInclusive: number, toInclusive: number): AsyncEnumerable<number> {
    const rangeIterable = range(fromInclusive, toInclusive);
    return new AsyncEnumerable(rangeIterable);
  }

  assert<TPredicate extends T>(predicate: TypePredicate<T, TPredicate> | AsyncPredicate<T>): AsyncEnumerable<TPredicate> {
    const asserted = assertAsync<T, TPredicate>(this.source, predicate);
    return new AsyncEnumerable(asserted);
  }

  async all(predicate?: AsyncPredicate<T>): Promise<boolean> {
    return allAsync(this.source, predicate);
  }

  async any(predicate?: AsyncPredicate<T>): Promise<boolean> {
    return anyAsync(this.source, predicate);
  }

  batch(size: number): AsyncEnumerable<T[]> {
    const result = batchAsync(this.source, size);
    return new AsyncEnumerable(result);
  }

  buffer(size: number): AsyncEnumerable<T> {
    const result = bufferAsync(this.source, size);
    return new AsyncEnumerable(result);
  }

  cast<TNew extends T>(): AsyncEnumerable<TNew> {
    return this as AsyncEnumerable<any> as AsyncEnumerable<TNew>;
  }

  concat<U>(...iterables: AnyIterable<U>[]): AsyncEnumerable<T | U> {
    const concatted = concatAsync<T | U>(this.source, ...iterables);
    return new AsyncEnumerable(concatted);
  }

  defaultIfEmpty<TDefault>(defaultValue: TDefault): AsyncEnumerable<T | TDefault> {
    const result = defaultIfEmptyAsync(this.source, defaultValue);
    return new AsyncEnumerable(result);
  }

  difference(iterable: AnyIterable<T>, selector?: AsyncIteratorFunction<T, unknown>): AsyncEnumerable<T> {
    const result = differenceAsync(this.source, iterable, selector);
    return new AsyncEnumerable(result);
  }

  differenceMany(iterables: AnyIterable<T>[], selector?: AsyncIteratorFunction<T, unknown>): AsyncEnumerable<T> {
    const result = differenceManyAsync(this.source, iterables, selector);
    return new AsyncEnumerable(result);
  }

  distinct(selector?: AsyncIteratorFunction<T, any>): AsyncEnumerable<T> {
    const result = distinctAsync(this.source, selector);
    return new AsyncEnumerable(result);
  }

  async drain(): Promise<void> {
    await drainAsync(this.source);
  }

  filter<TPredicate extends T = T>(predicate: TypePredicate<T, TPredicate> | AsyncPredicate<T>): AsyncEnumerable<TPredicate> {
    const filtered = filterAsync<T, TPredicate>(this.source, predicate);
    return new AsyncEnumerable(filtered);
  }

  filterNullOrUndefined(): AsyncEnumerable<NonNullable<T>> {
    return this.filter((item): item is NonNullable<T> => isNotNullOrUndefined(item));
  }

  async first<TPredicate extends T = T>(predicate?: TypePredicate<T, TPredicate> | AsyncPredicate<T>): Promise<TPredicate> {
    return firstAsync(this.source, predicate);
  }

  async firstOrDefault<D, TPredicate extends T = T>(defaultValue: D, predicate?: TypePredicate<T, TPredicate> | AsyncPredicate<T>): Promise<TPredicate | D> {
    return firstOrDefaultAsync(this.source, defaultValue, predicate);
  }

  forceCast<TNew>(): AsyncEnumerable<TNew> {
    return this as AsyncEnumerable<any> as AsyncEnumerable<TNew>;
  }

  async forEach(func: AsyncIteratorFunction<T, any>): Promise<void> {
    await forEachAsync(this.source, func);
  }

  group<TGroup>(selector: AsyncIteratorFunction<T, TGroup>): AsyncEnumerable<[TGroup, T[]]> {
    const grouped = groupAsync(this.source, selector);
    return new AsyncEnumerable(grouped);
  }

  groupSingle<TGroup>(selector: AsyncIteratorFunction<T, TGroup>): AsyncEnumerable<[TGroup, T]> {
    const grouped = groupSingleAsync(this.source, selector);
    return new AsyncEnumerable(grouped);
  }

  async groupToMap<TGroup>(selector: AsyncIteratorFunction<T, TGroup>): Promise<Map<TGroup, T[]>> {
    return groupToMapAsync<T, TGroup>(this.source, selector);
  }

  async groupToSingleMap<TGroup>(selector: AsyncIteratorFunction<T, TGroup>): Promise<Map<TGroup, T>> {
    return groupToSingleMapAsync<T, TGroup>(this.source, selector);
  }

  tap(tapper: AsyncIteratorFunction<T, any>): AsyncEnumerable<T> {
    const iterator = tapAsync(this.source, tapper);
    return new AsyncEnumerable(iterator);
  }

  interruptEvery(value: number): AsyncEnumerable<T> {
    const interrupted = interruptEveryAsync(this.source, value);
    return new AsyncEnumerable(interrupted);
  }

  interruptPerSecond(value: number): AsyncEnumerable<T> {
    const interrupted = interruptPerSecondAsync(this.source, value);
    return new AsyncEnumerable(interrupted);
  }

  async last<TPredicate extends T = T>(predicate?: TypePredicate<T, TPredicate> | AsyncPredicate<T>): Promise<TPredicate> {
    return lastAsync(this.source, predicate);
  }

  async lastOrDefault<D, TPredicate extends T = T>(defaultValue: D, predicate?: TypePredicate<T, TPredicate> | AsyncPredicate<T>): Promise<TPredicate | D> {
    return lastOrDefaultAsync(this.source, defaultValue, predicate);
  }

  map<TOut>(mapper: AsyncIteratorFunction<T, TOut>): AsyncEnumerable<TOut> {
    const result = mapAsync(this.source, mapper);
    return new AsyncEnumerable(result);
  }

  mapMany<TOut>(mapper: AsyncIteratorFunction<T, AnyIterable<TOut>>): AsyncEnumerable<TOut> {
    const result = mapManyAsync(this.source, mapper);
    return new AsyncEnumerable(result);
  }

  materialize(): AsyncEnumerable<T> {
    const materialized = materializeAsync(this.source);
    return new AsyncEnumerable(materialized);
  }

  metadata(): AsyncEnumerable<IterableItemMetadata<T>> {
    const metadated = metadataAsync(this.source);
    return new AsyncEnumerable(metadated);
  }

  multiplex(count: number, bufferSize: number = 0): AsyncEnumerable<T>[] {
    const iterables = multiplexAsync(this.source, count, bufferSize);
    const enumerables = iterables.map((iterable) => new AsyncEnumerable(iterable));

    return enumerables;
  }

  pairwise(): AsyncEnumerable<[T, T]> {
    const pairwised = pairwiseAsync(this.source);
    return new AsyncEnumerable(pairwised);
  }

  async reduce(reducer: AsyncReducer<T, T>): Promise<T>;
  async reduce<U>(reducer: AsyncReducer<T, U>, initialValue: U): Promise<U>;
  async reduce<U>(reducer: AsyncReducer<T, U>, initialValue?: U): Promise<U> {
    return reduceAsync(this.source, reducer, initialValue);
  }

  retry(throwOnRetryFalse: boolean, predicate: AsyncRetryPredicate<T>): AsyncEnumerable<T> {
    const result = retryAsync(this.source, throwOnRetryFalse, predicate);
    return new AsyncEnumerable(result);
  }

  async single<TPredicate extends T = T>(predicate?: TypePredicate<T, TPredicate> | AsyncPredicate<T>): Promise<TPredicate> {
    return singleAsync(this.source, predicate);
  }

  async singleOrDefault<D, TPredicate extends T = T>(defaultValue: D, predicate?: TypePredicate<T, TPredicate> | AsyncPredicate<T>): Promise<TPredicate | D> {
    return singleOrDefaultAsync(this.source, defaultValue, predicate);
  }

  skip(count: number): AsyncEnumerable<T> {
    const skipped = skipAsync(this.source, count);
    return new AsyncEnumerable(skipped);
  }

  sort(comparator?: AsyncComparator<T>): AsyncEnumerable<T> {
    return AsyncEnumerable.fromDeferred(async () => sortAsync(this.source, comparator));
  }

  async sortToArray(comparator?: AsyncComparator<T>): Promise<T[]> {
    return sortAsync(this.source, comparator);
  }

  take(count: number): AsyncEnumerable<T> {
    const taken = takeAsync(this.source, count);
    return new AsyncEnumerable(taken);
  }

  takeUntil(cancellationToken: ReadonlyCancellationToken): AsyncEnumerable<T> {
    const taken = takeUntilAsync(this.source, cancellationToken);
    return new AsyncEnumerable(taken);
  }

  takeWhile(yieldLastOnFalse: boolean, predicate: AsyncPredicate<T>): AsyncEnumerable<T> {
    const taken = takeWhileAsync(this.source, yieldLastOnFalse, predicate);
    return new AsyncEnumerable(taken);
  }

  throttle(delayOrThrottleFunction: number | ThrottleFunction): AsyncEnumerable<T> {
    const result = throttle(this.source, delayOrThrottleFunction);
    return new AsyncEnumerable(result);
  }

  async toArray(): Promise<T[]> {
    return toArrayAsync(this.source);
  }

  toAsync(): this {
    return this;
  }

  toIterator(): AsyncIterator<T> {
    const iterator = iterableToAsyncIterator(this.source);
    return iterator;
  }

  async toSet(): Promise<Set<T>> {
    const iterable = await this.toSync();
    return new Set(iterable);
  }

  async toSync(): Promise<Enumerable<T>> {
    const syncIterable = await toSync(this.source);
    return (enumerable ?? Enumerable.from)(syncIterable);
  }

  while(predicate: AsyncPredicate<T>): AsyncEnumerable<T> {
    const whiled = whileAsync(this.source, predicate);
    return new AsyncEnumerable(whiled);
  }

  parallelFilter(concurrency: number, keepOrder: boolean, predicate: ParallelizablePredicate<T>): AsyncEnumerable<T> {
    const result = parallelFilter(this.source, concurrency, keepOrder, predicate);
    return new AsyncEnumerable(result);
  }

  async parallelForEach(concurrency: number, func: ParallelizableIteratorFunction<T, any>): Promise<void> {
    return parallelForEach(this.source, concurrency, func);
  }

  async parallelGroup<TGroup>(concurrency: number, selector: ParallelizableIteratorFunction<T, TGroup>): Promise<Map<TGroup, T[]>> {
    return parallelGroup(this.source, concurrency, selector);
  }

  parallelTap(concurrency: number, keepOrder: boolean, tapper: ParallelizableIteratorFunction<T, any>): AsyncEnumerable<T> {
    const result = parallelTap(this.source, concurrency, keepOrder, tapper);
    return new AsyncEnumerable(result);
  }

  parallelMap<TOut>(concurrency: number, keepOrder: boolean, func: ParallelizableIteratorFunction<T, TOut>): AsyncEnumerable<TOut> {
    const result = parallelMap(this.source, concurrency, keepOrder, func);
    return new AsyncEnumerable(result);
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    if (isAsyncIterableIterator(this.source)) {
      return this.source[Symbol.asyncIterator]();
    }

    if (isAnyIterable(this.source)) {
      return iterableToAsyncIterableIterator(this.source);
    }

    throw new Error('source is neither iterable nor async-iterable');
  }
}

// eslint-disable-next-line @typescript-eslint/unbound-method
setAsyncEnumerable?.(AsyncEnumerable.from);
