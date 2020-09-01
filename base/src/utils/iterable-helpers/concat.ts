export function* concat<T1, T2>(iterable1: Iterable<T1>, iterable2: Iterable<T2>): IterableIterator<T1 | T2> {
  yield* iterable1;
  yield* iterable2;
}
