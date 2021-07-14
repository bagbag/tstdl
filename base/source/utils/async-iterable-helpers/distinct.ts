import type { AnyIterable } from '../any-iterable-iterator';
import { isAsyncIterable } from './is-async-iterable';
import type { AsyncIteratorFunction } from './types';

export function distinctAsync<TIn>(iterable: AnyIterable<TIn>, selector: AsyncIteratorFunction<TIn, any> = (item) => item): AsyncIterableIterator<TIn> {
  return isAsyncIterable(iterable)
    ? async(iterable, selector)
    : sync(iterable, selector);
}

async function* sync<TIn>(iterable: Iterable<TIn>, selector: AsyncIteratorFunction<TIn, any>): AsyncIterableIterator<TIn> {
  const items = new Set();
  let index = 0;

  for (const item of iterable) {
    const returnValue = selector(item, index++);
    const selection = (returnValue instanceof Promise) ? await returnValue : returnValue;

    if (!items.has(selection)) {
      items.add(selection);
      yield item;
    }
  }
}

async function* async<TIn>(iterable: AsyncIterable<TIn>, selector: AsyncIteratorFunction<TIn, any>): AsyncIterableIterator<TIn> {
  const items = new Set();
  let index = 0;

  for await (const item of iterable) {
    const returnValue = selector(item, index++);
    const selection = (returnValue instanceof Promise) ? await returnValue : returnValue;

    if (!items.has(selection)) {
      items.add(selection);
      yield item;
    }
  }
}
