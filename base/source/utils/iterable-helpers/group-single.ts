import { groupToSingleMap } from './group-to-single-map.js';
import type { IteratorFunction } from './types.js';

export function groupSingle<TIn, TGroup>(iterable: Iterable<TIn>, selector: IteratorFunction<TIn, TGroup>): IterableIterator<[TGroup, TIn]> {
  return groupToSingleMap(iterable, selector)[Symbol.iterator]();
}
