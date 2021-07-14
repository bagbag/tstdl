export function* skip<T>(iterable: Iterable<T>, count: number): IterableIterator<T> {
  let index = 0;
  for (const item of iterable) {
    if (index++ >= count) {
      yield item;
    }
  }
}
