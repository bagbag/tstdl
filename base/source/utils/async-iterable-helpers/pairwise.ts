import type { AnyIterable } from '../any-iterable-iterator.js';
import { isAsyncIterable } from './is-async-iterable.js';

export function pairwiseAsync<T>(iterable: AnyIterable<T>): AsyncIterableIterator<[T, T]> {
  return isAsyncIterable(iterable)
    ? async<T>(iterable)
    : sync<T>(iterable);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function* sync<T>(iterable: Iterable<T>): AsyncIterableIterator<[T, T]> {
  let hasPrevious = false;
  let previous: T;

  for (const item of iterable) {
    if (hasPrevious) {
      yield [previous!, item];
    }
    else {
      hasPrevious = true;
    }

    previous = item;
  }
}

async function* async<T>(iterable: AsyncIterable<T>): AsyncIterableIterator<[T, T]> {
  let hasPrevious = false;
  let previous: T;

  for await (const item of iterable) {
    if (hasPrevious) {
      yield [previous!, item];
    }
    else {
      hasPrevious = true;
    }

    previous = item;
  }
}
