import { MultiKeyMap } from '#/data-structures/multi-key-map.js';
import type { GroupSelectors, IteratorFunction } from './types.js';

export function groupToMap<TIn, TGroup>(iterable: Iterable<TIn>, selector: IteratorFunction<TIn, TGroup>): Map<TGroup, TIn[]>;
export function groupToMap<TIn, TGroup extends [any, ...any[]]>(iterable: Iterable<TIn>, ...selectors: GroupSelectors<TIn, TGroup>): Map<TGroup['length'] extends 1 ? TGroup[0] : TGroup, TIn[]>;
export function groupToMap<TIn, TGroup extends [any, ...any[]]>(iterable: Iterable<TIn>, ...selectors: GroupSelectors<TIn, TGroup>): Map<TGroup, TIn[]> {
  let index = 0;

  if (selectors.length == 1) {
    const selector = selectors[0];
    const map = new Map<TGroup[0], TIn[]>();

    for (const item of iterable) {
      const groupKey = selector(item, index++) as TGroup[0];

      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }

      map.get(groupKey)!.push(item);
    }

    return map;
  }

  const map = new MultiKeyMap<TGroup, TIn[]>();

  for (const item of iterable) {
    const groupKeys = selectors.map((selector): any => selector(item, index)) as TGroup;
    index++;

    if (!map.has(groupKeys)) {
      map.set(groupKeys, []);
    }

    map.get(groupKeys)!.push(item);
  }

  return map.toMap();
}
