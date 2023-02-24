import type { AnyIterable } from '../../any-iterable-iterator.js';
import { FactoryMap } from '../../factory-map.js';
import type { ParallelizableIteratorFunction } from '../types.js';
import { parallelForEach } from './for-each.js';

export async function parallelGroup<TIn, TGroup>(iterable: AnyIterable<TIn>, concurrency: number, selector: ParallelizableIteratorFunction<TIn, TGroup>): Promise<Map<TGroup, TIn[]>> {
  const map = new FactoryMap<TGroup, TIn[]>(() => []);

  await parallelForEach(iterable, concurrency, async (item, index) => {
    const groupKey = await selector(item, index);
    map.get(groupKey).push(item);
  });

  return map.backingMap;
}
