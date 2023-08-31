import type { AnyIterable } from '../any-iterable-iterator.js';
import { isAsyncIterable } from './is-async-iterable.js';

export function takeAsync<T>(iterable: AnyIterable<T>, count: number): AsyncIterableIterator<T> {
  return isAsyncIterable(iterable)
    ? async<T>(iterable, count)
    : sync<T>(iterable, count);
}

async function* sync<T>(iterable: Iterable<T>, count: number): AsyncIterableIterator<T> {
  if (count <= 0) {
    return;
  }

  let counter = 0;
  for (const item of iterable) {
    yield item;

    if (++counter >= count) {
      break;
    }
  }
}

async function* async<T>(iterable: AsyncIterable<T>, count: number): AsyncIterableIterator<T> {
  if (count <= 0) {
    return;
  }

  let counter = 0;
  for await (const item of iterable) {
    yield item;

    if (++counter >= count) {
      break;
    }
  }
}
