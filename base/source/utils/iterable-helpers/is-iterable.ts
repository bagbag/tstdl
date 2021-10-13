import type { AnyIterable } from '../any-iterable-iterator';
import { isFunction, isNotNullOrUndefined } from '../type-guards';

export function isIterable<T>(value: unknown): value is Iterable<T> {
  return isNotNullOrUndefined(value) && isFunction((value as Iterable<T>)[Symbol.iterator]);
}

export function isIterableIterator<T>(anyIterable: AnyIterable<T>): anyIterable is IterableIterator<T>;
export function isIterableIterator<T = any>(value: any): value is IterableIterator<T> {
  return isIterable(value) && isFunction((value as Partial<IterableIterator<any>>).next);
}
