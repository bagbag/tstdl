import type { AnyIterable } from '../any-iterable-iterator.js';
import { isIterable } from '../iterable-helpers/is-iterable.js';
import { toArrayAsync } from './to-array.js';

export async function toSync<T>(iterable: AnyIterable<T>): Promise<Iterable<T>> {
  return (isIterable(iterable))
    ? iterable
    : toArrayAsync(iterable);
}
