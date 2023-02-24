import type { AnyIterable } from '../any-iterable-iterator.js';
import { concatAsync } from './concat.js';
import { mapAsync } from './map.js';
import { toArrayAsync } from './to-array.js';
import type { AsyncIteratorFunction } from './types.js';

export async function* differenceAsync<T>(baseIterable: AnyIterable<T>, iterable: AnyIterable<T>, selector: AsyncIteratorFunction<T, any> = (item) => item): AsyncIterableIterator<T> {
  const diffItems = mapAsync(iterable, selector);
  const diffItemsArray = await toArrayAsync(diffItems);
  const diffItemsSet = new Set(diffItemsArray);

  let index = 0;
  for await (const item of baseIterable) {
    const selected = await selector(item, index++);

    if (!diffItemsSet.has(selected)) {
      yield item;
    }
  }
}

export async function* differenceManyAsync<T>(baseIterable: AnyIterable<T>, iterables: AnyIterable<T>[], selector: AsyncIteratorFunction<T, any> = (item) => item): AsyncIterableIterator<T> {
  const items = concatAsync(...iterables);
  const diffItems = mapAsync(items, selector);
  const diffItemsArray = await toArrayAsync(diffItems);
  const diffItemsSet = new Set(diffItemsArray);

  let index = 0;
  for await (const item of baseIterable) {
    const selected = selector(item, index++);

    if (!diffItemsSet.has(selected)) {
      yield item;
    }
  }
}
