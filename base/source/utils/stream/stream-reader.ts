import { BadRequestError } from '#/errors/bad-request.error.js';
import type { AnyIterable } from '../any-iterable-iterator.js';
import { isAnyIterable } from '../any-iterable-iterator.js';
import { concatArrayBufferViews } from '../binary.js';
import { isDefined } from '../type-guards.js';
import { getReadableStreamIterable } from './readable-stream-adapter.js';

// eslint-disable-next-line max-statements
export async function readBinaryStream(iterableOrStream: AnyIterable<Uint8Array> | ReadableStream<Uint8Array>, length?: number): Promise<Uint8Array> {
  const iterable = isAnyIterable(iterableOrStream) ? iterableOrStream : getReadableStreamIterable(iterableOrStream);

  if (isDefined(length)) {
    const array = new Uint8Array(length);

    let bytesWritten = 0;
    for await (const chunk of iterable) {
      if ((bytesWritten + chunk.length) > length) {
        throw new BadRequestError('Size of stream is greater than provided length.');
      }

      array.set(chunk, bytesWritten);
      bytesWritten += chunk.length;
    }

    if (bytesWritten != length) {
      throw new BadRequestError('Size of stream did not match provided length.');
    }

    return array;
  }

  let totalLength = 0;
  const chunks: Uint8Array[] = [];

  for await (const chunk of iterable) {
    chunks.push(chunk);
    totalLength += chunk.length;
  }

  if (chunks.length == 0) {
    return new Uint8Array(0);
  }

  return concatArrayBufferViews(chunks, totalLength);
}
