import { Predicate } from './types';

export function* whileSync<T>(iterable: Iterable<T>, predicate: Predicate<T>): IterableIterator<T> {
  let index = 0;

  for (const item of iterable) {
    yield item;

    const goOn = predicate(item, index++);

    if (!goOn) {
      return;
    }
  }
}
