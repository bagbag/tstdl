import { groupToMap } from './group-to-map.js';
import type { IteratorFunction } from './types.js';

export function group<TIn, TGroup>(iterable: Iterable<TIn>, selector: IteratorFunction<TIn, TGroup>): IterableIterator<[TGroup, TIn[]]> {
  return groupToMap(iterable, selector)[Symbol.iterator]();
}
