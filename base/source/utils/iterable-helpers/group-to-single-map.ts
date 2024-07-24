import { MultiKeyMap } from '#/data-structures/multi-key-map.js';
import type { GroupSelectors, IteratorFunction } from './types.js';

export function groupToSingleMap<TIn, TGroup>(iterable: Iterable<TIn>, selector: IteratorFunction<TIn, TGroup>): Map<TGroup, TIn>;
export function groupToSingleMap<TIn, TGroup extends [any, ...any[]]>(iterable: Iterable<TIn>, ...selectors: GroupSelectors<TIn, TGroup>): Map<TGroup['length'] extends 1 ? TGroup[0] : TGroup, TIn>;
export function groupToSingleMap<TIn, TGroup extends [any, ...any[]]>(iterable: Iterable<TIn>, ...selectors: GroupSelectors<TIn, TGroup>): Map<TGroup, TIn> {
  let index = 0;

  if (selectors.length == 1) {
    const selector = selectors[0];
    const map = new Map<TGroup[0], TIn>();

    for (const item of iterable) {
      const groupKey = selector(item, index++) as TGroup[0];

      if (map.has(groupKey)) {
        throw new Error(`Group ${String(groupKey)} has more than one item.`);
      }

      map.set(groupKey, item);
    }

    return map;
  }

  const map = new MultiKeyMap<TGroup, TIn>();

  for (const item of iterable) {
    const groupKeys = selectors.map((selector): any => selector(item, index)) as TGroup; // eslint-disable-line @typescript-eslint/no-loop-func
    index++;

    if (map.has(groupKeys)) {
      throw new Error(`Group [${groupKeys.map((key) => String(key)).join(', ')}] has more than one item.`);
    }

    map.set(groupKeys, item);
  }

  return map.toMap();
}
