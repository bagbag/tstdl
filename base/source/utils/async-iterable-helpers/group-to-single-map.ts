import { MultiKeyMap } from '#/data-structures/multi-key-map.js';
import type { AnyIterable } from '../any-iterable-iterator.js';
import { isAsyncIterable } from './is-async-iterable.js';
import type { AsyncGroupSelectors, AsyncIteratorFunction } from './types.js';

export async function groupToSingleMapAsync<TIn, TGroup>(iterable: AnyIterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): Promise<Map<TGroup, TIn>>;
export async function groupToSingleMapAsync<TIn, TGroup extends [any, ...any[]]>(iterable: AnyIterable<TIn>, ...selectors: AsyncGroupSelectors<TIn, TGroup>): Promise<Map<TGroup['length'] extends 1 ? TGroup[0] : TGroup, TIn>>;
export async function groupToSingleMapAsync<TIn, TGroup extends [any, ...any[]]>(iterable: AnyIterable<TIn>, ...selectors: AsyncGroupSelectors<TIn, TGroup>): Promise<Map<TGroup, TIn>> {
  return isAsyncIterable(iterable)
    ? async<TIn, TGroup>(iterable, ...selectors)
    : sync<TIn, TGroup>(iterable, ...selectors);
}

async function async<TIn, TGroup>(iterable: AsyncIterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): Promise<Map<TGroup, TIn>>;
async function async<TIn, TGroup extends [any, ...any[]]>(iterable: AsyncIterable<TIn>, ...selectors: AsyncGroupSelectors<TIn, TGroup>): Promise<Map<TGroup['length'] extends 1 ? TGroup[0] : TGroup, TIn>>;
async function async<TIn, TGroup extends [any, ...any[]]>(iterable: AsyncIterable<TIn>, ...selectors: AsyncGroupSelectors<TIn, TGroup>): Promise<Map<TGroup, TIn>> {
  let index = 0;

  if (selectors.length == 1) {
    const selector = selectors[0];
    const map = new Map<TGroup[0], TIn>();

    for await (const item of iterable) {
      const groupKey = await selector(item, index++) as TGroup[0];

      if (map.has(groupKey)) {
        throw new Error(`Group ${String(groupKey)} has more than one item.`);
      }

      map.set(groupKey, item);
    }

    return map;
  }

  const map = new MultiKeyMap<TGroup, TIn>();

  for await (const item of iterable) {
    const groupKeys = await Promise.all(selectors.map(async (selector): Promise<any> => selector(item, index) as Promise<TGroup[number]>)) as TGroup; // eslint-disable-line @typescript-eslint/no-loop-func
    index++;

    if (map.has(groupKeys)) {
      throw new Error(`Group [${groupKeys.map((key) => String(key)).join(', ')}] has more than one item.`);
    }

    map.set(groupKeys, item);
  }

  return map.toMap();
}

async function sync<TIn, TGroup>(iterable: Iterable<TIn>, selector: AsyncIteratorFunction<TIn, TGroup>): Promise<Map<TGroup, TIn>>;
async function sync<TIn, TGroup extends [any, ...any[]]>(iterable: Iterable<TIn>, ...selectors: AsyncGroupSelectors<TIn, TGroup>): Promise<Map<TGroup['length'] extends 1 ? TGroup[0] : TGroup, TIn>>;
async function sync<TIn, TGroup extends [any, ...any[]]>(iterable: Iterable<TIn>, ...selectors: AsyncGroupSelectors<TIn, TGroup>): Promise<Map<TGroup, TIn>> {
  let index = 0;

  if (selectors.length == 1) {
    const selector = selectors[0];
    const map = new Map<TGroup[0], TIn>();

    for (const item of iterable) {
      const groupKey = await selector(item, index++) as TGroup[0];

      if (map.has(groupKey)) {
        throw new Error(`Group ${String(groupKey)} has more than one item.`);
      }

      map.set(groupKey, item);
    }

    return map;
  }

  const map = new MultiKeyMap<TGroup, TIn>();

  for (const item of iterable) {
    const groupKeys = await Promise.all(selectors.map(async (selector): Promise<any> => selector(item, index) as Promise<TGroup[number]>)) as TGroup; // eslint-disable-line @typescript-eslint/no-loop-func
    index++;

    if (map.has(groupKeys)) {
      throw new Error(`Group [${groupKeys.map((key) => String(key)).join(', ')}] has more than one item.`);
    }

    map.set(groupKeys, item);
  }

  return map.toMap();
}
