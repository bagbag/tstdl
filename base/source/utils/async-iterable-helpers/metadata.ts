import type { AnyIterable } from '../any-iterable-iterator.js';
import type { IterableItemMetadata } from '../iterable-helpers/types.js';
import { isAsyncIterable } from './is-async-iterable.js';

export function metadataAsync<T>(iterable: AnyIterable<T>): AsyncIterableIterator<IterableItemMetadata<T>> {
  return (isAsyncIterable(iterable))
    ? async(iterable)
    : sync(iterable);
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function* sync<T>(iterable: Iterable<T>): AsyncIterableIterator<IterableItemMetadata<T>> {
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

export async function* async<T>(iterable: AnyIterable<T>): AsyncIterableIterator<IterableItemMetadata<T>> {
  let index = 0;
  let isFirst = true;

  let hasPrevious = false;
  let previous: T;

  for await (const item of iterable) {
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
