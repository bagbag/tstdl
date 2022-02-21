import { CircularBuffer } from '#/data-structures/circular-buffer';
import type { AnyIterable } from '../any-iterable-iterator';
import { CancellationToken } from '../cancellation-token';
import { hasOwnProperty } from '../object/object';
import { takeUntilAsync } from './take-until';

type BufferItem<T> =
  | { end: false, value: T }
  | { end: true, error?: Error };

// eslint-disable-next-line max-lines-per-function, max-statements
export async function* bufferAsync<T>(iterable: AnyIterable<T>, size: number): AsyncIterableIterator<T> {
  const buffer = new CircularBuffer<BufferItem<T>>(Math.max(1, size));

  const consumerEndedToken = new CancellationToken();
  let consumerHasError = false;
  let consumerError: any;

  void (async () => {
    try {
      for await (const item of takeUntilAsync(iterable, consumerEndedToken)) {
        buffer.add({ end: false, value: item });

        if (buffer.isFull) {
          await buffer.$onFreeSlots;
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (consumerHasError) {
          throw consumerError;
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (consumerEndedToken.isSet) {
          return;
        }
      }

      buffer.add({ end: true });
    }
    catch (error: unknown) {
      buffer.add({ end: true, error: error as Error });
    }
  })();

  try {
    for await (const item of buffer.consumeAsync()) {
      if (item.end) {
        if (hasOwnProperty(item, 'error')) {
          throw item.error!;
        }

        break;
      }

      yield item.value;
    }
  }
  catch (error: unknown) {
    consumerHasError = true;
    consumerError = error as Error;
    throw error;
  }
  finally {
    consumerEndedToken.set();
    buffer.clear();
  }
}
