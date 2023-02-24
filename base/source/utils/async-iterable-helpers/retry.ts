import type { AnyIterable } from '../any-iterable-iterator.js';
import { isAsyncIterable } from './is-async-iterable.js';
import type { AsyncRetryPredicate } from './types.js';

export function retryAsync<T>(iterable: AnyIterable<T>, throwOnRetryFalse: boolean, predicate: AsyncRetryPredicate<T>): AsyncIterableIterator<T> {
  return isAsyncIterable(iterable)
    ? async(iterable, throwOnRetryFalse, predicate)
    : sync(iterable, throwOnRetryFalse, predicate);
}

async function* sync<T>(iterable: Iterable<T>, throwOnRetryFalse: boolean, predicate: AsyncRetryPredicate<T>): AsyncIterableIterator<T> {
  let index = -1;

  for (const item of iterable) {
    index++;

    let success = false;
    let retry = true;

    while (!success && retry) {
      try {
        yield item;
        success = true;
      }
      catch (error: unknown) {
        const returnValue = predicate(error as Error, item, index);

        retry = (returnValue instanceof Promise)
          ? await returnValue
          : returnValue;

        if (!retry && throwOnRetryFalse) {
          throw error;
        }
      }
    }
  }
}

async function* async<T>(iterable: AsyncIterable<T>, throwOnRetryFalse: boolean, predicate: AsyncRetryPredicate<T>): AsyncIterableIterator<T> {
  let index = -1;

  for await (const item of iterable) {
    index++;

    let success = false;
    let retry = true;

    while (!success && retry) {
      try {
        yield item;
        success = true;
      }
      catch (error: unknown) {
        const returnValue = predicate(error as Error, item, index);

        retry = (returnValue instanceof Promise)
          ? await returnValue
          : returnValue;

        if (!retry && throwOnRetryFalse) {
          throw error;
        }
      }
    }
  }
}
