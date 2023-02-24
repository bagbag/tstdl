import type { AnyIterable } from '../any-iterable-iterator.js';
import { groupToMapAsync } from './group-to-map.js';
import type { AsyncIteratorFunction } from './types.js';

export async function* groupAsync<TIn, TGroup>(iterable: AnyIterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): AsyncIterableIterator<[TGroup, TIn[]]> {
  yield* await groupToMapAsync(iterable, selector);
}
