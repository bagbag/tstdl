import type { AnyIterable } from '../any-iterable-iterator';
import { groupToMapAsync } from './group-to-map';
import type { AsyncIteratorFunction } from './types';

export async function* groupAsync<TIn, TGroup>(iterable: AnyIterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): AsyncIterableIterator<[TGroup, TIn[]]> {
  yield* await groupToMapAsync(iterable, selector);
}
