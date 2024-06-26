import type { IteratorFunction } from './types.js';

export function groupToMap<TIn, TGroup>(iterable: Iterable<TIn>, selector: IteratorFunction<TIn, TGroup>): Map<TGroup, TIn[]> {
  const map = new Map<TGroup, TIn[]>();

  let index = 0;
  for (const item of iterable) {
    const groupKey = selector(item, index++);

    if (!map.has(groupKey)) {
      map.set(groupKey, []);
    }

    map.get(groupKey)!.push(item);
  }

  return map;
}
