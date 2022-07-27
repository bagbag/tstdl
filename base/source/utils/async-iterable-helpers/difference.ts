import type { AnyIterable } from '../any-iterable-iterator';
import { concatAsync } from './concat';
import { mapAsync } from './map';
import { toArrayAsync } from './to-array';
import type { AsyncIteratorFunction } from './types';

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
