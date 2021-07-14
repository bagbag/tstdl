import type { AnyIterable } from '../any-iterable-iterator';

export async function* takeAsync<T>(iterable: AnyIterable<T>, count: number): AsyncIterableIterator<T> {
  if (count <= 0) {
    return;
  }

  let counter = 0;
  for await (const item of iterable) {
    yield item;

    if (++counter >= count) {
      break;
    }
  }
}
