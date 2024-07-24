import { groupToMap } from './group-to-map.js';
import type { GroupSelectors, IteratorFunction } from './types.js';

export function group<TIn, TGroup>(iterable: Iterable<TIn>, selector: IteratorFunction<TIn, TGroup>): IterableIterator<[TGroup, TIn[]]>;
export function group<TIn, TGroup extends [any, ...any[]]>(iterable: Iterable<TIn>, ...selectors: GroupSelectors<TIn, TGroup>): IterableIterator<[TGroup['length'] extends 1 ? TGroup[0] : TGroup, TIn[]]>;
export function group<TIn, TGroup extends [any, ...any[]]>(iterable: Iterable<TIn>, ...selectors: GroupSelectors<TIn, TGroup>): IterableIterator<[TGroup, TIn[]]> {
  return groupToMap<TIn, TGroup>(iterable, ...selectors)[Symbol.iterator]();
}
