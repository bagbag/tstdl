import type { AnyIterable } from '../any-iterable-iterator';
import { any } from '../iterable-helpers/any';
import { anyAsync } from './any';
import { isAsyncIterable } from './is-async-iterable';

export async function includesAsync<T>(iterable: AnyIterable<T>, value: T): Promise<boolean> {
  return isAsyncIterable(iterable)
    ? anyAsync(iterable, (item) => item == value)
    : any(iterable, (item) => item == value);
}
