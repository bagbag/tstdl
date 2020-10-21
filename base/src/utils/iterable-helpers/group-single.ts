import { groupToSingleMap } from './group-to-single-map';
import type { IteratorFunction } from './types';

export function groupSingle<TIn, TGroup>(iterable: Iterable<TIn>, selector: IteratorFunction<TIn, TGroup>): IterableIterator<[TGroup, TIn]> {
  return groupToSingleMap(iterable, selector)[Symbol.iterator]();
}
