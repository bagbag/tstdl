import type { AnyIterable } from '../any-iterable-iterator.js';
import { groupToMapAsync } from './group-to-map.js';
import type { AsyncGroupSelectors, AsyncIteratorFunction } from './types.js';

export function groupAsync<TIn, TGroup>(iterable: AnyIterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): AsyncIterableIterator<[TGroup, TIn[]]>;
export function groupAsync<TIn, TGroup extends [any, ...any[]]>(iterable: AnyIterable<TIn>, ...selectors: AsyncGroupSelectors<TIn, TGroup>): AsyncIterableIterator<[TGroup['length'] extends 1 ? TGroup[0] : TGroup, TIn[]]>;
export async function* groupAsync<TIn, TGroup extends [any, ...any[]]>(iterable: AnyIterable<TIn>, ...selectors: AsyncGroupSelectors<TIn, TGroup>): AsyncIterableIterator<[TGroup, TIn[]]> {
  yield* await groupToMapAsync<TIn, TGroup>(iterable, ...selectors);
}
