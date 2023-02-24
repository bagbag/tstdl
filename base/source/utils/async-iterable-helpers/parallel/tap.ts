import type { AnyIterable } from '../../any-iterable-iterator.js';
import type { ParallelizableIteratorFunction } from '../types.js';
import { parallelFeed } from './feed.js';

export function parallelTap<T>(iterable: AnyIterable<T>, concurrency: number, keepOrder: boolean, tapper: ParallelizableIteratorFunction<T, any>): AsyncIterable<T> {
  return parallelFeed(iterable, concurrency, keepOrder, async (item, index, feed) => {
    await tapper(item, index);
    feed(item, index);
  });
}
