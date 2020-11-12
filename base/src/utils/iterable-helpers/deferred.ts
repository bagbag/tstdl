export function* deferredIterable<T>(source: () => Iterable<T>): IterableIterator<T> {
  yield* source();
}
