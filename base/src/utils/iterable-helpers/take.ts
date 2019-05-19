export function* take<T>(iterable: Iterable<T>, count: number): IterableIterator<T> {
  if (count <= 0) {
    return;
  }

  let index = 0;
  for (const item of iterable) {
    yield item;

    if (++index >= count) {
      break;
    }
  }
}
