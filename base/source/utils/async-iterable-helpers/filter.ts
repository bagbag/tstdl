import type { AnyIterable } from '../any-iterable-iterator.js';
import { isAsyncIterable } from './is-async-iterable.js';
import type { AsyncPredicate } from './types.js';

export function filterAsync<T, TNew extends T = T>(iterable: AnyIterable<T>, predicate: AsyncPredicate<T>): AsyncIterableIterator<TNew> {
  return isAsyncIterable(iterable)
    ? async<T, TNew>(iterable, predicate)
    : sync<T, TNew>(iterable, predicate);
}

async function* sync<T, TNew extends T = T>(iterable: Iterable<T>, predicate: AsyncPredicate<T>): AsyncIterableIterator<TNew> {
  let index = 0;

  for (const item of iterable) {
    let matches = predicate(item, index++);

    if (matches instanceof Promise) {
      matches = await matches;
    }

    if (matches) {
      yield item as TNew;
    }
  }
}

async function* async<T, TNew extends T = T>(iterable: AsyncIterable<T>, predicate: AsyncPredicate<T>): AsyncIterableIterator<TNew> {
  let index = 0;

  for await (const item of iterable) {
    let matches = predicate(item, index++);

    if (matches instanceof Promise) {
      matches = await matches;
    }

    if (matches) {
      yield item as Awaited<TNew>;
    }
  }
}
