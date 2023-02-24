import { concat } from './concat.js';
import { map } from './map.js';
import type { IteratorFunction } from './types.js';

export function* difference<T>(baseIterable: Iterable<T>, iterable: Iterable<T>, selector: IteratorFunction<T, any> = (item) => item): IterableIterator<T> {
  const diffItems = map(iterable, selector);
  const diffItemsSet = new Set(diffItems);

  let index = 0;
  for (const item of baseIterable) {
    const selected = selector(item, index++);

    if (!diffItemsSet.has(selected)) {
      yield item;
    }
  }
}

export function* differenceMany<T>(baseIterable: Iterable<T>, iterables: Iterable<T>[], selector: IteratorFunction<T, any> = (item) => item): IterableIterator<T> {
  const items = concat(...iterables);
  const diffItems = map(items, selector);
  const diffItemsSet = new Set(diffItems);

  let index = 0;
  for (const item of baseIterable) {
    const selected = selector(item, index++);

    if (!diffItemsSet.has(selected)) {
      yield item;
    }
  }
}
