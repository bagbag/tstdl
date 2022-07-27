export function* concat<T>(...iterables: Iterable<T>[]): IterableIterator<T> {
  for (const iterable of iterables) {
    yield* iterable;
  }
}
