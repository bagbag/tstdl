import type { IteratorFunction } from './types.js';

export function* tap<T>(iterable: Iterable<T>, tapper: IteratorFunction<T, any>): IterableIterator<T> {
  let index = 0;

  for (const item of iterable) {
    tapper(item, index++);
    yield item;
  }
}
