import { Predicate } from './types';

export function* takeWhile<T>(iterable: Iterable<T>, breakWhenFalse: boolean, predicate: Predicate<T>): IterableIterator<T> {
  let index = 0;
  for (const item of iterable) {
    const take = predicate(item, index++);

    if (take) {
      yield item;
    }
    else if (breakWhenFalse) {
      break;
    }
  }
}
