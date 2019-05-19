import { AnyIterable } from '../any-iterable-iterator';
import { isAsyncIterable } from './is-async-iterable';
import { AsyncPredicate } from './types';

export function filterAsync<T>(iterable: AnyIterable<T>, predicate: AsyncPredicate<T>): AsyncIterableIterator<T> {
  return isAsyncIterable(iterable)
    ? async(iterable, predicate)
    : sync(iterable, predicate);
}

async function* sync<T>(iterable: Iterable<T>, predicate: AsyncPredicate<T>): AsyncIterableIterator<T> {
  let index = 0;

  for (const item of iterable) {
    let matches = predicate(item, index++);

    if (matches instanceof Promise) {
      matches = await matches;
    }

    if (matches) {
      yield item;
    }
  }
}

async function* async<T>(iterable: AsyncIterable<T>, predicate: AsyncPredicate<T>): AsyncIterableIterator<T> {
  let index = 0;

  for await (const item of iterable) {
    let matches = predicate(item, index++);

    if (matches instanceof Promise) {
      matches = await matches;
    }

    if (matches) {
      yield item;
    }
  }
}
