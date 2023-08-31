import type { AnyIterable } from '../any-iterable-iterator.js';
import { filterAsync } from './filter.js';

export function skipAsync<T>(iterable: AnyIterable<T>, count: number): AsyncIterableIterator<T> {
  return filterAsync(iterable, (_item, index) => index >= count);
}
