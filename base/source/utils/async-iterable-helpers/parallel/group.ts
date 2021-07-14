import type { AnyIterable } from '../../any-iterable-iterator';
import { FactoryMap } from '../../factory-map';
import type { ParallelizableIteratorFunction } from '../types';
import { parallelForEach } from './for-each';

export async function parallelGroup<TIn, TGroup>(iterable: AnyIterable<TIn>, concurrency: number, selector: ParallelizableIteratorFunction<TIn, TGroup>): Promise<Map<TGroup, TIn[]>> {
  const map = new FactoryMap<TGroup, TIn[]>(() => []);

  await parallelForEach(iterable, concurrency, async (item, index) => {
    const groupKey = await selector(item, index);
    map.get(groupKey).push(item);
  });

  return map.backingMap;
}
