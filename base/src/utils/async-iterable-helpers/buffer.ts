import { ObservableArray } from '../../collections/observable';
import type { AnyIterable } from '../any-iterable-iterator';

type BufferItem<T> =
  | { end: false, value: T }
  | { end: true, error?: Error };

// eslint-disable-next-line max-lines-per-function, max-statements
export async function* bufferAsync<T>(iterable: AnyIterable<T>, size: number): AsyncIterableIterator<T> {
  const buffer = new ObservableArray<BufferItem<T>>();

  let end = false;
  let consumerError: Error | undefined;

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  (async () => {
    try {
      for await (const item of iterable) {
        buffer.add({ end: false, value: item });

        if (buffer.length >= size) {
          await buffer.$remove;
        }

        if (consumerError != undefined) {
          throw consumerError;
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (end) {
          break;
        }
      }

      buffer.add({ end: true });
    }
    catch (error: unknown) {
      buffer.add({ end: true, error: error as Error });
    }
  })();

  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      if (buffer.length == 0) {
        await buffer.$add;
      }

      const item = buffer.removeFirst();

      if (item.end) {
        if (item.error != undefined) {
          throw item.error;
        }

        break;
      }

      yield item.value;
    }
  }
  catch (error: unknown) {
    consumerError = error as Error;
    throw error;
  }
  finally {
    end = true;
    buffer.clear();
  }
}
