import { groupToMap } from './group-to-map';
import type { IteratorFunction } from './types';

export function group<TIn, TGroup>(iterable: Iterable<TIn>, selector: IteratorFunction<TIn, TGroup>): IterableIterator<[TGroup, TIn[]]> {
  return groupToMap(iterable, selector)[Symbol.iterator]();
}
