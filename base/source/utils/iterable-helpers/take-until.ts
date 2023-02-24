import type { ReadonlyCancellationToken } from '../cancellation-token.js';

export function* takeUntil<T>(iterable: Iterable<T>, cancellationToken: ReadonlyCancellationToken): IterableIterator<T> {
  const iterator = iterable[Symbol.iterator]();

  while (cancellationToken.isUnset) {
    const result = iterator.next();

    if (result.done == true) {
      return;
    }

    yield result.value;
  }
}
