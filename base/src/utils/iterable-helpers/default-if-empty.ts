export function* defaultIfEmpty<T, TDefault>(iterable: Iterable<T>, defaultValue: TDefault): IterableIterator<T | TDefault> {
  let empty = true;

  for (const item of iterable) {
    empty = false;
    yield item;
  }

  if (empty) {
    yield defaultValue;
  }
}
