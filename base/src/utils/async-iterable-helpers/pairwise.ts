import type { AnyIterable } from '../any-iterable-iterator';
import { isAsyncIterable } from './is-async-iterable';

export function pairwiseAsync<T>(iterable: AnyIterable<T>): AsyncIterableIterator<[T, T]> {
  return isAsyncIterable(iterable)
    ? async<T>(iterable)
    : sync<T>(iterable);
}

export async function* sync<T>(iterable: Iterable<T>): AsyncIterableIterator<[T, T]> {
  let hasPrevious = false;
  let previous: T;

  for (const item of iterable) {
    if (hasPrevious) {
      yield [previous!, item];
    }
    else {
      hasPrevious = true;
    }

    previous = item;
  }
}

export async function* async<T>(iterable: AsyncIterable<T>): AsyncIterableIterator<[T, T]> {
  let hasPrevious = false;
  let previous: T;

  for await (const item of iterable) {
    if (hasPrevious) {
      yield [previous!, item];
    }
    else {
      hasPrevious = true;
    }

    previous = item;
  }
}
