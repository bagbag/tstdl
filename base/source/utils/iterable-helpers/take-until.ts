import type { CancellationSignal } from '#/cancellation/token.js';

export function* takeUntil<T>(iterable: Iterable<T>, cancellationSignal: CancellationSignal): IterableIterator<T> {
  const iterator = iterable[Symbol.iterator]();

  while (cancellationSignal.isUnset) {
    const result = iterator.next();

    if (result.done == true) {
      return;
    }

    yield result.value;
  }
}
