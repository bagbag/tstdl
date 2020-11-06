import type { AnyIterable } from '../any-iterable-iterator';
import { isAsyncIterable } from './is-async-iterable';
import type { AsyncIteratorFunction } from './types';

export function tapAsync<T>(iterable: AnyIterable<T>, tapper: AsyncIteratorFunction<T, any>): AsyncIterableIterator<T> {
  return isAsyncIterable(iterable)
    ? async(iterable, tapper)
    : sync(iterable, tapper);
}

async function* sync<T>(iterable: Iterable<T>, tapper: AsyncIteratorFunction<T, any>): AsyncIterableIterator<T> {
  let index = 0;

  for (const item of iterable) {
    const returnValue = tapper(item, index++);

    if (returnValue instanceof Promise) {
      await returnValue;
    }

    yield item;
  }
}

async function* async<T>(iterable: AsyncIterable<T>, tapper: AsyncIteratorFunction<T, any>): AsyncIterableIterator<T> {
  let index = 0;

  for await (const item of iterable) {
    const returnValue = tapper(item, index++);

    if (returnValue instanceof Promise) {
      await returnValue;
    }

    yield item;
  }
}
