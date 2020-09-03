import type { AnyIterable } from '../any-iterable-iterator';
import { isIterable } from '../iterable-helpers/is-iterable';
import { toArrayAsync } from './to-array';

export async function toSync<T>(iterable: AnyIterable<T>): Promise<Iterable<T>> {
  return (isIterable(iterable))
    ? iterable
    : toArrayAsync(iterable);
}
