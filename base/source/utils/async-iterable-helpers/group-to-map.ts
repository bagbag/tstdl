import type { AnyIterable } from '../any-iterable-iterator.js';
import { FactoryMap } from '../factory-map.js';
import { isAsyncIterable } from './is-async-iterable.js';
import type { AsyncIteratorFunction } from './types.js';

export async function groupToMapAsync<TIn, TGroup>(iterable: AnyIterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): Promise<Map<TGroup, TIn[]>> {
  return isAsyncIterable(iterable)
    ? async(iterable, selector)
    : sync(iterable, selector);
}

async function async<TIn, TGroup>(iterable: AsyncIterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): Promise<Map<TGroup, TIn[]>> {
  const map = new FactoryMap<TGroup, TIn[]>(() => []);

  let index = 0;
  for await (const item of iterable) {
    const groupKey = await selector(item, index++);
    map.get(groupKey).push(item);
  }

  return map.backingMap;
}

async function sync<TIn, TGroup>(iterable: Iterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): Promise<Map<TGroup, TIn[]>> {
  const map = new FactoryMap<TGroup, TIn[]>(() => []);

  let index = 0;
  for (const item of iterable) {
    const groupKey = await selector(item, index++);
    map.get(groupKey).push(item);
  }

  return map.backingMap;
}
