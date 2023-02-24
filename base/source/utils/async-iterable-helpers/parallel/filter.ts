import type { AnyIterable } from '../../any-iterable-iterator.js';
import type { ParallelizablePredicate } from '../types.js';
import { parallelFeed } from './feed.js';

export function parallelFilter<T>(iterable: AnyIterable<T>, concurrency: number, keepOrder: boolean, predicate: ParallelizablePredicate<T>): AsyncIterable<T> {
  return parallelFeed(iterable, concurrency, keepOrder, async (item, index, feed) => {
    const matches = await predicate(item, index);

    if (matches) {
      feed(item, index);
    }
  });
}
