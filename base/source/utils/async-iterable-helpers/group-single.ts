import type { AnyIterable } from '../any-iterable-iterator';
import { groupToSingleMapAsync } from './group-to-single-map';
import type { AsyncIteratorFunction } from './types';

export async function* groupSingleAsync<TIn, TGroup>(iterable: AnyIterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): AsyncIterableIterator<[TGroup, TIn]> {
  yield* await groupToSingleMapAsync(iterable, selector);
}
