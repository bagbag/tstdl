import type { IterableItemMetadata } from './types.js';

export function* metadata<T>(iterable: Iterable<T>): IterableIterator<IterableItemMetadata<T>> {
  let index = 0;
  let isFirst = true;

  let hasPrevious = false;
  let previous: T;

  for (const item of iterable) {
    if (hasPrevious) {
      yield { index: index++, isFirst, isLast: false, value: previous! };
      isFirst = false;
    }
    else {
      hasPrevious = true;
    }

    previous = item;
  }

  if (hasPrevious) {
    yield { index: index++, isFirst, isLast: true, value: previous! };
  }
}
