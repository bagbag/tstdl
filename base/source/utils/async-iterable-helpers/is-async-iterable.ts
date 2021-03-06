import type { AnyIterable } from '../any-iterable-iterator';

export function isAsyncIterable<T>(anyIterable: unknown): anyIterable is AsyncIterable<T> {
  if (anyIterable == undefined) {
    return false;
  }

  return typeof (anyIterable as AsyncIterable<T>)[Symbol.asyncIterator] == 'function';
}

export function isAsyncIterableIterator<T>(anyIterable: AnyIterable<T>): anyIterable is AsyncIterableIterator<T>;
export function isAsyncIterableIterator<T = any>(obj: any): obj is AsyncIterableIterator<T> {
  const isIterable = isAsyncIterable(obj);
  const isIterator = typeof (obj as Partial<AsyncIterableIterator<any>>).next == 'function';

  return isIterable && isIterator;
}
