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
  onLengthSubceed?: 'error' | 'close' | 'leave-open'
};

export async function readBinaryStream(iterableOrStream: AnyIterable<ArrayBufferView> | ReadableStream<ArrayBufferView>, { length, onLengthExceed = 'error', onLengthSubceed = 'error' }: ReadBinaryStreamOptions = {}): Promise<Uint8Array> {
  const stream = isReadableStream(iterableOrStream)
    ? isDefined(length)
      ? toBytesStream(iterableOrStream)
      : iterableOrStream
    : getReadableStreamFromIterable(iterableOrStream);

  if (isDefined(length)) {
    const reader = stream.getReader({ mode: 'byob' });

    let buffer = new ArrayBuffer(length + 1);
    let bytesRead = 0;

    while (true) {
      const result = await reader.read(new Uint8Array(buffer, bytesRead, buffer.byteLength - bytesRead));

      buffer = result.value!.buffer;
      bytesRead += result.value!.byteLength;

      if (result.done) {
        break;
      }

      if (bytesRead > length) {
        switch (onLengthExceed) {
          case 'error':
            await reader.cancel();
            throw new MaxBytesExceededError('Size of stream is greater than provided length.');

          case 'close':
            await reader.cancel();
            break;

          case 'leave-open':
            reader.releaseLock();
            break;

          default:
            throw new NotSupportedError(`Action ${onLengthExceed as string} not supported.`);
        }
      }

      if (bytesRead == length + 1) {
        break;
      }
    }

    if (bytesRead < length) {
      switch (onLengthSubceed) {
        case 'error':
          await reader.cancel();
          throw new BadRequestError('Size of stream was less than provided length.');

        case 'close':
          await reader.cancel();
          break;

        case 'leave-open':
          reader.releaseLock();
          break;

        default:
          throw new NotSupportedError(`Action ${onLengthSubceed as string} not supported.`);
      }
    }

    await reader.cancel();
    return new Uint8Array(buffer, 0, Math.min(length, bytesRead));
  }

  let totalLength = 0;
  const reader = stream.getReader();
  const views: ArrayBufferView[] = [];

  while (true) {
    const result = await reader.read();

    if (result.done) {
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
