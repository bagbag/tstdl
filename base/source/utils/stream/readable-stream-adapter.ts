import type { AnyIterable, AnyIterator } from '../any-iterable-iterator.js';
import { isAsyncIterable } from '../async-iterable-helpers/is-async-iterable.js';

export async function* getReadableStreamIterable<T>(stream: ReadableStream<T>, options: { close?: boolean } = {}): AsyncIterable<T> {
  const reader = stream.getReader();

  try {
    while (true) {
      const result = await reader.read();

      if (result.done) {
        return;
      }

      yield result.value;
    }
  }
  finally {
    if (options.close != false) {
      await reader.cancel();
    }

    reader.releaseLock();
  }
}

export function getReadableStreamFromIterable<T>(iterable: AnyIterable<T>): ReadableStream<T> {
  let iterator: AnyIterator<T> | undefined;

  return new ReadableStream({
    cancel: async (reason) => {
      await iterator!.return?.(reason);
    },
    pull: async (controller) => {
      const result = await iterator!.next();

      if (result.done == true) {
        controller.close();
      }
      else {
        controller.enqueue(result.value);
      }
    },
    start: () => {
      iterator = isAsyncIterable(iterable) ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
    }
  });
}
