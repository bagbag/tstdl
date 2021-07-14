export function materialize<T>(iterable: Iterable<T>): Iterable<T> {
  return [...iterable];
}
