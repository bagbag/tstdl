import type { AnyIterable } from '../any-iterable-iterator.js';
import { createArray } from '../array/array.js';
import { FeedableAsyncIterable } from '../feedable-async-iterable.js';

export function multiplexAsync<T>(iterable: AnyIterable<T>, count: number, bufferSize: number): AsyncIterable<T>[] {
  if (bufferSize <= 0) {
    throw new Error('bufferSize must be greater than 0');
  }

  const feedableIterables: FeedableAsyncIterable<T>[] = createArray(count, () => new FeedableAsyncIterable());

  void multiplexTo(iterable, feedableIterables, bufferSize);

  return feedableIterables;
}

async function multiplexTo<T>(input: AnyIterable<T>, outputs: FeedableAsyncIterable<T>[], bufferSize: number): Promise<void> {
  try {
    for await (const item of input) {
      await waitForDrain(outputs, bufferSize);
      outputs.forEach((feedableIterable) => feedableIterable.feed(item));
    }

    outputs.forEach((feedableIterable) => feedableIterable.end());
  }
  catch (error: unknown) {
    outputs.forEach((feedableIterable) => feedableIterable.throw(error as Error));
  }
}

async function waitForDrain(feedableIterables: FeedableAsyncIterable<any>[], bufferSize: number): Promise<void> {
  for (const feedableIterable of feedableIterables) {
    while (feedableIterable.bufferSize >= bufferSize) {
      await feedableIterable.$read;
    }
  }
}
