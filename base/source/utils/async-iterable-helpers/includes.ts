import type { AnyIterable } from '../any-iterable-iterator.js';
import { any } from '../iterable-helpers/any.js';
import { anyAsync } from './any.js';
import { isAsyncIterable } from './is-async-iterable.js';

export async function includesAsync<T>(iterable: AnyIterable<T>, value: T): Promise<boolean> {
  return isAsyncIterable(iterable)
    ? anyAsync(iterable, (item) => item == value)
    : any(iterable, (item) => item == value);
}
