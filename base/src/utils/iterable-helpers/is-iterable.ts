import { AnyIterable } from '../any-iterable-iterator';

export function isIterable<T>(anyIterable: AnyIterable<T>): anyIterable is Iterable<T> {
  if (anyIterable == undefined) {
    return false;
  }

  return typeof (anyIterable as Iterable<T>)[Symbol.iterator] == 'function';
}

export function isIterableIterator<T>(anyIterable: AnyIterable<T>): anyIterable is IterableIterator<T> {
  const typeIsIterable = isIterable(anyIterable);
  const isIterator = typeof (anyIterable as Partial<IterableIterator<unknown>>).next == 'function';

  return typeIsIterable && isIterator;
}
