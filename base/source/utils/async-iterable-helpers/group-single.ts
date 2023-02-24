import type { AnyIterable } from '../any-iterable-iterator.js';
import { groupToSingleMapAsync } from './group-to-single-map.js';
import type { AsyncIteratorFunction } from './types.js';

export async function* groupSingleAsync<TIn, TGroup>(iterable: AnyIterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): AsyncIterableIterator<[TGroup, TIn]> {
  yield* await groupToSingleMapAsync(iterable, selector);
}
