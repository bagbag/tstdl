import { AnyIterable } from '../any-iterable-iterator';
import { AwaitableList } from '../collections/awaitable';

type BufferItem<T> =
  | { end: false, value: T }
  | { end: true, error?: Error };

// eslint-disable-next-line max-lines-per-function, max-statements
export async function* bufferAsync<T>(iterable: AnyIterable<T>, size: number): AsyncIterableIterator<T> {
  const buffer = new AwaitableList<BufferItem<T>>();

  let end: boolean = false;
  let consumerError: Error | undefined;

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  (async () => {
    try {
      for await (const item of iterable) {
        buffer.append({ end: false, value: item });

        if (buffer.size >= size) {
          await buffer.removed;
        }

        if (consumerError != undefined) {
          throw consumerError;
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (end) {
          break;
        }
      }

      buffer.append({ end: true });
    }
    catch (error) {
      buffer.append({ end: true, error: error as Error });
    }
  })();

  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      if (buffer.size == 0) {
        await buffer.added;
      }

      const item = buffer.shift();

      if (item.end) {
        if (item.error != undefined) {
          throw item.error;
        }

        break;
      }

      yield item.value;
    }
  }
  catch (error) {
    consumerError = error as Error;
    throw error;
  }
  finally {
    end = true;
    buffer.clear();
  }
}
