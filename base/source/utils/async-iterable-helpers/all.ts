import type { AnyIterable } from '../any-iterable-iterator.js';
import { isAsyncIterable } from './is-async-iterable.js';
import type { AsyncPredicate } from './types.js';

export async function allAsync<T>(iterable: AnyIterable<T>, predicate: AsyncPredicate<T> = () => true): Promise<boolean> {
  return isAsyncIterable(iterable)
    ? async(iterable, predicate)
    : sync(iterable, predicate);
}

async function sync<T>(iterable: Iterable<T>, predicate: AsyncPredicate<T>): Promise<boolean> {
  let index = 0;

  for (const item of iterable) {
    let matches = predicate(item, index++);

    if (matches instanceof Promise) {
      matches = await matches;
    }

    if (!matches) {
      return false;
    }
  }

  return true;
}

async function async<T>(iterable: AsyncIterable<T>, predicate: AsyncPredicate<T>): Promise<boolean> {
  let index = 0;

  for await (const item of iterable) {
    let matches = predicate(item, index++);

    if (matches instanceof Promise) {
      matches = await matches;
    }

    if (!matches) {
      return false;
    }
  }

  return true;
}
