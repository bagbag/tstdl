import type { AnyIterable } from '../any-iterable-iterator.js';
import { groupToSingleMapAsync } from './group-to-single-map.js';
import type { AsyncGroupSelectors, AsyncIteratorFunction } from './types.js';

export function groupSingleAsync<TIn, TGroup>(iterable: AnyIterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): AsyncIterableIterator<[TGroup, TIn]>;
export function groupSingleAsync<TIn, TGroup extends [any, ...any[]]>(iterable: AnyIterable<TIn>, ...selectors: AsyncGroupSelectors<TIn, TGroup>): AsyncIterableIterator<[TGroup['length'] extends 1 ? TGroup[0] : TGroup, TIn]>;
export async function* groupSingleAsync<TIn, TGroup extends [any, ...any[]]>(iterable: AnyIterable<TIn>, ...selectors: AsyncGroupSelectors<TIn, TGroup>): AsyncIterableIterator<[TGroup, TIn]> {
  yield* await groupToSingleMapAsync<TIn, TGroup>(iterable, ...selectors);
}
