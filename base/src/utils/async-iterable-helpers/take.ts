import { AnyIterable } from '../any-iterable-iterator';
import { takeWhileAsync } from './take-while';

export function takeAsync<T>(iterable: AnyIterable<T>, count: number): AsyncIterableIterator<T> {
  return takeWhileAsync(iterable, true, (_item, index) => index < count);
}
