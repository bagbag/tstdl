import type { AnyIterable } from '../any-iterable-iterator.js';
import { assert as assertHelper } from '../type-guards.js';
import { isAsyncIterable } from './is-async-iterable.js';
import type { AsyncPredicate } from './types.js';

export function assertAsync<T, TPredicate extends T = T>(iterable: AnyIterable<T>, predicate: AsyncPredicate<T>): AsyncIterableIterator<TPredicate> {
  return isAsyncIterable(iterable)
    ? async(iterable, predicate)
    : sync(iterable, predicate);
}

async function* sync<T, TPredicate extends T = T>(iterable: Iterable<T>, predicate: AsyncPredicate<T>): AsyncIterableIterator<TPredicate> {
  let index = 0;

  for (const item of iterable) {
    let returnValue = predicate(item, index++);

    if (returnValue instanceof Promise) {
      returnValue = await returnValue;
    }

    assertHelper(returnValue);
    yield item as TPredicate;
  }
}

async function* async<T, TPredicate extends T = T>(iterable: AsyncIterable<T>, predicate: AsyncPredicate<T>): AsyncIterableIterator<TPredicate> {
  let index = 0;

  for await (const item of iterable) {
    let returnValue = predicate(item, index++);

    if (returnValue instanceof Promise) {
      returnValue = await returnValue;
    }

    assertHelper(returnValue);
    yield item as Awaited<TPredicate>;
  }
}
