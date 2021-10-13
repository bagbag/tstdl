import type { AnyIterable } from '../any-iterable-iterator';
import { isFunction, isNotNullOrUndefined } from '../type-guards';

export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return isNotNullOrUndefined(value) && isFunction((value as AsyncIterable<T>)[Symbol.asyncIterator]);
}

export function isAsyncIterableIterator<T>(anyIterable: AnyIterable<T>): anyIterable is AsyncIterableIterator<T>;
export function isAsyncIterableIterator<T = any>(value: any): value is AsyncIterableIterator<T> {
  return isAsyncIterable(value) && isFunction((value as Partial<AsyncIterableIterator<any>>).next);
}
