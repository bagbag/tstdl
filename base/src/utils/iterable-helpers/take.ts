export function* take<T>(iterable: Iterable<T>, count: number): IterableIterator<T> {
  if (count <= 0) {
    return;
  }

  let counter = 0;
  for (const item of iterable) {
    yield item;

    if (++counter >= count) {
      break;
    }
  }
}
