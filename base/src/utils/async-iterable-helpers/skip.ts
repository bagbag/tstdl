import type { AnyIterable } from '../any-iterable-iterator';
import { takeWhileAsync } from './take-while';

export function skipAsync<T>(iterable: AnyIterable<T>, count: number): AsyncIterableIterator<T> {
  return takeWhileAsync(iterable, false, (_item, index) => index >= count);
}
