export function* pairwise<T>(iterable: Iterable<T>): IterableIterator<[left: T, right: T]> {
  let hasPrevious = false;
  let previous: T;

  for (const item of iterable) {
    if (hasPrevious) {
      yield [previous!, item];
    }
    else {
      hasPrevious = true;
    }

    previous = item;
  }
}
