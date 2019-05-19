import { AnyIterable } from '../any-iterable-iterator';
import { isAsyncIterable } from './is-async-iterable';
import { AsyncPredicate } from './types';

export function takeWhileAsync<T>(iterable: AnyIterable<T>, breakWhenFalse: boolean, predicate: AsyncPredicate<T>): AsyncIterableIterator<T> {
  return isAsyncIterable(iterable)
    ? async(iterable, breakWhenFalse, predicate)
    : sync(iterable, breakWhenFalse, predicate);
}

async function* sync<T>(iterable: Iterable<T>, breakWhenFalse: boolean, predicate: AsyncPredicate<T>): AsyncIterableIterator<T> {
  let index = 0;
  for (const item of iterable) {
    const returnValue = predicate(item, index++);

    const take = (returnValue instanceof Promise)
      ? await returnValue
      : returnValue;

    if (take) {
      yield item;
    }
    else if (breakWhenFalse) {
      break;
    }
  }
}

async function* async<T>(iterable: AsyncIterable<T>, breakWhenFalse: boolean, predicate: AsyncPredicate<T>): AsyncIterableIterator<T> {
  let index = 0;
  for await (const item of iterable) {
    const returnValue = predicate(item, index++);

    const take = (returnValue instanceof Promise)
      ? await returnValue
      : returnValue;

    if (take) {
      yield item;
    }
    else if (breakWhenFalse) {
      break;
    }
  }
}
