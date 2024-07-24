import { groupToSingleMap } from './group-to-single-map.js';
import type { GroupSelectors, IteratorFunction } from './types.js';

export function groupSingle<TIn, TGroup>(iterable: Iterable<TIn>, selector: IteratorFunction<TIn, TGroup>): IterableIterator<[TGroup, TIn]>;
export function groupSingle<TIn, TGroup extends [any, ...any[]]>(iterable: Iterable<TIn>, ...selectors: GroupSelectors<TIn, TGroup>): IterableIterator<[TGroup['length'] extends 1 ? TGroup[0] : TGroup, TIn]>;
export function groupSingle<TIn, TGroup extends [any, ...any[]]>(iterable: Iterable<TIn>, ...selectors: GroupSelectors<TIn, TGroup>): IterableIterator<[TGroup, TIn]> {
  return groupToSingleMap<TIn, TGroup>(iterable, ...selectors)[Symbol.iterator]();
}
