import { IteratorFunction } from './types';

export function* distinct<TIn>(iterable: Iterable<TIn>, selector: IteratorFunction<TIn, any> = (item) => item): IterableIterator<TIn> {
  const items = new Set();
  let index = 0;

  for (const item of iterable) {
    const selection = selector(item, index++);

    if (!items.has(selection)) {
      items.add(selection);
      yield item;
    }
  }
}
