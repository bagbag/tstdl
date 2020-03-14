import { AnyIterable } from '../any-iterable-iterator';
import { isAsyncIterable } from './is-async-iterable';

export function batchAsync<T>(iterable: AnyIterable<T>, size: number): AsyncIterableIterator<T[]> {
  return isAsyncIterable(iterable)
    ? async(iterable, size)
    : sync(iterable, size);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function* sync<T>(iterable: Iterable<T>, size: number): AsyncIterableIterator<T[]> {
  let buffer: T[] = [];

  for (const item of iterable) {
    buffer.push(item);

    if (buffer.length >= size) {
      yield buffer;
      buffer = [];
    }
  }

  if (buffer.length > 0) {
    yield buffer;
  }
}

async function* async<T>(iterable: AsyncIterable<T>, size: number): AsyncIterableIterator<T[]> {
  let buffer: T[] = [];

  for await (const item of iterable) {
    buffer.push(item);

    if (buffer.length >= size) {
      yield buffer;
      buffer = [];
    }
  }

  if (buffer.length > 0) {
    yield buffer;
  }
}
