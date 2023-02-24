import type { AnyIterable } from '../../any-iterable-iterator.js';
import type { ParallelizableIteratorFunction } from '../types.js';
import { parallelFeed } from './feed.js';

export function parallelMap<TIn, TOut>(iterable: AnyIterable<TIn>, concurrency: number, keepOrder: boolean, mapper: ParallelizableIteratorFunction<TIn, TOut>): AsyncIterable<TOut> {
  return parallelFeed(iterable, concurrency, keepOrder, async (item, index, feed) => {
    const mapped = await mapper(item, index);
    feed(mapped, index);
  });
}
