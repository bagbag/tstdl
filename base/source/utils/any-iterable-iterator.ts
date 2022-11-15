import { isAsyncIterable } from './async-iterable-helpers/is-async-iterable';
import { isIterable } from './iterable-helpers/is-iterable';

export type AnyIterable<T> = Iterable<T> | AsyncIterable<T>;
export type AnyIterator<T> = Iterator<T> | AsyncIterator<T>;
export type AnyIterableIterator<T> = IterableIterator<T> | AsyncIterableIterator<T>;

export function isAnyIterable<T = any>(obj: any): obj is AnyIterable<T> {
  return isIterable(obj) || isAsyncIterable(obj);
}
