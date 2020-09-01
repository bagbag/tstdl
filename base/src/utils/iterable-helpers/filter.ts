import type { Predicate } from './types';

export function* filter<T, TNew extends T = T>(iterable: Iterable<T>, predicate: Predicate<T>): IterableIterator<TNew> {
  let index = 0;

  for (const item of iterable) {
    const matches = predicate(item, index++);

    if (matches) {
      yield item as TNew;
    }
  }
}
