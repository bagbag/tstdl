import { AnyIterable } from '../any-iterable-iterator';
import { isAsyncIterable } from './is-async-iterable';
import { AsyncIteratorFunction } from './types';

export function interceptAsync<T>(iterable: AnyIterable<T>, interceptor: AsyncIteratorFunction<T, void>): AsyncIterableIterator<T> {
  return isAsyncIterable(iterable)
    ? async(iterable, interceptor)
    : sync(iterable, interceptor);
}

async function* sync<T>(iterable: Iterable<T>, interceptor: AsyncIteratorFunction<T, void>): AsyncIterableIterator<T> {
  let index = 0;

  for (const item of iterable) {
    const returnValue = interceptor(item, index++);

    if (returnValue instanceof Promise) {
      await returnValue;
    }

    yield item;
  }
}

async function* async<T>(iterable: AsyncIterable<T>, interceptor: AsyncIteratorFunction<T, void>): AsyncIterableIterator<T> {
  let index = 0;

  for await (const item of iterable) {
    const returnValue = interceptor(item, index++);

    if (returnValue instanceof Promise) {
      await returnValue;
    }

    yield item;
  }
}
