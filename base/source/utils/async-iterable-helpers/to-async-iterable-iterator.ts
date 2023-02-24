import type { AnyIterable } from '../any-iterable-iterator.js';

// eslint-disable-next-line @typescript-eslint/require-await
export async function* iterableToAsyncIterableIterator<T>(iterable: AnyIterable<T>): AsyncIterableIterator<T> {
  yield* iterable;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function* iteratorToAsyncIterableIterator<T, TReturn, TNext>(iterator: Iterator<T, TReturn, TNext>): AsyncIterableIterator<T> {
  try {
    while (true) {
      const result = iterator.next();

      if (result.done == true) {
        return result.value;
      }

      try {
        yield result.value;
      }
      catch (error) {
        iterator.throw?.(error);
        throw error;
      }
    }
  }
  finally {
    iterator.return?.();
  }
}

export async function* asyncIteratorToAsyncIterableIterator<T, TReturn, TNext>(iterator: AsyncIterator<T, TReturn, TNext>): AsyncIterableIterator<T> {
  try {
    while (true) {
      const result = await iterator.next();

      if (result.done == true) {
        return result.value;
      }

      try {
        yield result.value;
      }
      catch (error) {
        await iterator.throw?.(error);
        throw error;
      }
    }
  }
  finally {
    await iterator.return?.();
  }
}
