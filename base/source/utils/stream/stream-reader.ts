import { BadRequestError } from '#/errors/bad-request.error.js';
import { MaxBytesExceededError } from '#/errors/max-bytes-exceeded.error.js';
import { NotSupportedError } from '#/errors/not-supported.error.js';
import type { AnyIterable } from '../any-iterable-iterator.js';
import { isAsyncIterable } from '../async-iterable-helpers/is-async-iterable.js';
import { concatArrayBufferViews } from '../binary.js';
import { isDefined, isReadableStream } from '../type-guards.js';
import { getReadableStreamFromIterable, getReadableStreamIterable } from './readable-stream-adapter.js';
import { toBytesStream } from './to-bytes-stream.js';

export type ReadBinaryStreamOptions = {
  length?: number,

  /** Action if source stream has more bytes than provided length */
  onLengthExceed?: 'error' | 'close' | 'leave-open',

  /** Action if source stream has less bytes than provided length */
  onLengthSubceed?: 'error' | 'close' | 'leave-open',
};

export async function readBinaryStream(iterableOrStream: AnyIterable<ArrayBufferView> | ReadableStream<ArrayBufferView>, { length, onLengthExceed = 'error', onLengthSubceed = 'error' }: ReadBinaryStreamOptions = {}): Promise<Uint8Array> {
  const stream = isReadableStream(iterableOrStream)
    ? isDefined(length)
      ? toBytesStream(iterableOrStream)
      : iterableOrStream
    : getReadableStreamFromIterable(iterableOrStream);

  if (isDefined(length)) {
    const reader = stream.getReader({ mode: 'byob' });

    let buffer = new ArrayBuffer(length + 1); // To read one extra byte for exceed detection
    let bytesRead = 0;
    let shouldCancelReaderAtEnd = true;

    try {
      while (true) {
        const view = new Uint8Array(buffer, bytesRead, buffer.byteLength - bytesRead);
        const result = await reader.read(view);

        buffer = result.value!.buffer;
        bytesRead += result.value!.byteLength;

        if (result.done) {
          break;
        }

        // Check if we have read more data than the specified 'length'.
        // This implies bytesRead is at least length + 1.
        if (bytesRead > length) {
          switch (onLengthExceed) {
            case 'error':
              await reader.cancel();
              shouldCancelReaderAtEnd = false;
              throw new MaxBytesExceededError('Size of stream is greater than provided length.');

            case 'close':
              await reader.cancel();
              shouldCancelReaderAtEnd = false;
              break;

            case 'leave-open':
              reader.releaseLock();
              shouldCancelReaderAtEnd = false;
              break;

            default:
              await reader.cancel();
              shouldCancelReaderAtEnd = false;
              throw new NotSupportedError(`Action ${onLengthExceed as string} not supported.`);
          }
          break;
        }
      }

      if (bytesRead < length) { // Stream ended before specified length was read
        switch (onLengthSubceed) {
          case 'error':
            if (shouldCancelReaderAtEnd) {
              await reader.cancel();
            }

            shouldCancelReaderAtEnd = false;
            throw new BadRequestError('Size of stream was less than provided length.');

          case 'close':
            if (shouldCancelReaderAtEnd) {
              await reader.cancel();
            }

            shouldCancelReaderAtEnd = false;
            break;

          case 'leave-open':
            if (shouldCancelReaderAtEnd) {
              reader.releaseLock();
            }

            shouldCancelReaderAtEnd = false;
            break;

          default:
            if (shouldCancelReaderAtEnd) {
              await reader.cancel();
            }

            shouldCancelReaderAtEnd = false;
            throw new NotSupportedError(`Action ${onLengthSubceed as string} not supported.`);
        }
      }

      if (shouldCancelReaderAtEnd) {
        await reader.cancel();
      }

      return new Uint8Array(buffer, 0, Math.min(length, bytesRead));
    }
    catch (error) {
      // If an error occurred (e.g., network, or thrown by logic above)
      // and reader hasn't been handled, try to cancel it.
      // This is a "best effort" cleanup.
      if (shouldCancelReaderAtEnd && reader) {
        try {
          await reader.cancel(error); // Pass the error reason
        }
        catch { /* ignore */ }
      }

      throw error;
    }
  }

  let totalLength = 0;
  const reader = stream.getReader();
  const views: ArrayBufferView[] = [];

  while (true) {
    const result = await reader.read();

    if (result.done) {
      if (isDefined(result.value)) {
        views.push(result.value);
        totalLength += result.value.byteLength;
      }

      break;
    }

    views.push(result.value);
    totalLength += result.value.byteLength;
  }

  if (views.length == 0) {
    return new Uint8Array(0);
  }

  return concatArrayBufferViews(views, Uint8Array, totalLength);
}

export async function readTextStream(iterableOrStream: AsyncIterable<string> | ReadableStream<string>): Promise<string> {
  const iterable = isAsyncIterable(iterableOrStream) ? iterableOrStream : getReadableStreamIterable(iterableOrStream);

  let text = '';

  for await (const chunk of iterable) {
    text += chunk;
  }

  return text;
}
