import type { AnyIterable } from '../any-iterable-iterator.js';
import { isAsyncIterable } from './is-async-iterable.js';
import type { AsyncPredicate } from './types.js';

export function takeWhileAsync<T>(iterable: AnyIterable<T>, yieldLastOnFalse: boolean, predicate: AsyncPredicate<T>): AsyncIterableIterator<T> {
  return isAsyncIterable(iterable)
    ? async(iterable, yieldLastOnFalse, predicate)
    : sync(iterable, yieldLastOnFalse, predicate);
}

async function* sync<T>(iterable: Iterable<T>, yieldLastOnFalse: boolean, predicate: AsyncPredicate<T>): AsyncIterableIterator<T> {
  let index = 0;
  for (const item of iterable) {
    const returnValue = predicate(item, index++);
    const take = (returnValue instanceof Promise)
      ? await returnValue
      : returnValue;

    if (take || yieldLastOnFalse) {
      yield item;
    }

    if (!take) {
      break;
    }
  }
}

async function* async<T>(iterable: AsyncIterable<T>, yieldLastOnFalse: boolean, predicate: AsyncPredicate<T>): AsyncIterableIterator<T> {
  let index = 0;
  for await (const item of iterable) {
    const returnValue = predicate(item, index++);
    const take = (returnValue instanceof Promise)
      ? await returnValue
      : returnValue;

    if (take || yieldLastOnFalse) {
      yield item;
    }

    if (!take) {
      break;
    }
  }
}
