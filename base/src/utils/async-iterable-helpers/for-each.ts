import { AnyIterable } from '../any-iterable-iterator';
import { isAsyncIterable } from './is-async-iterable';
import { AsyncIteratorFunction } from './types';

// eslint-disable-next-line @typescript-eslint/promise-function-async
export function forEachAsync<T>(iterable: AnyIterable<T>, func: AsyncIteratorFunction<T, any>): Promise<void> {
  return isAsyncIterable(iterable)
    ? async(iterable, func)
    : sync(iterable, func);
}

async function sync<T>(iterable: Iterable<T>, func: AsyncIteratorFunction<T, any>): Promise<void> {
  let index = 0;

  for (const item of iterable) {
    const returnValue = func(item, index++);

    if (returnValue instanceof Promise) {
      await returnValue;
    }
  }
}

async function async<T>(iterable: AsyncIterable<T>, func: AsyncIteratorFunction<T, any>): Promise<void> {
  let index = 0;

  for await (const item of iterable) {
    const returnValue = func(item, index++);

    if (returnValue instanceof Promise) {
      await returnValue;
    }
  }
}
