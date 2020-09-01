import { AnyIterable } from '../any-iterable-iterator';
import { FilterPredicate } from '../iterable-helpers';
import { isAsyncIterable } from './is-async-iterable';
import { AsyncPredicate } from './types';

export function filterAsync<T, TNew extends T = T>(iterable: AnyIterable<T>, predicate: AsyncPredicate<T> | FilterPredicate<T, TNew>): AsyncIterableIterator<TNew> {
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
      yield item as TNew;
    }
  }
}
