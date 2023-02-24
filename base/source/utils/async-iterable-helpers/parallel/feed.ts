import type { AnyIterable } from '../../any-iterable-iterator.js';
import { FeedableAsyncIterable } from '../../feedable-async-iterable.js';
import { OrderedFeedableAsyncIterable } from '../../ordered-feedable-async-iterable.js';
import { parallelForEach } from './for-each.js';
import type { FeedFunction, ParallelFeedIteratorFunction } from './types.js';

export async function* parallelFeed<TIn, TOut>(iterable: AnyIterable<TIn>, concurrency: number, keepOrder: boolean, func: ParallelFeedIteratorFunction<TIn, TOut>): AsyncIterable<TOut> {
  let out: FeedableAsyncIterable<TOut> | OrderedFeedableAsyncIterable<TOut>;
  let feed: FeedFunction<TOut>;

  if (keepOrder) {
    out = new OrderedFeedableAsyncIterable();
    feed = (item: TOut, index: number) => (out as OrderedFeedableAsyncIterable<TOut>).feed(item, index);
  }
  else {
    out = new FeedableAsyncIterable();
    feed = (item: TOut) => (out as FeedableAsyncIterable<TOut>).feed(item);
  }

  try {
    await parallelForEach(iterable, concurrency, async (item, index) => {
      await func(item, index, feed);
    });

    out.end();
  }
  catch (error) {
    out.throw(error as Error);
  }

  yield* out;
}
