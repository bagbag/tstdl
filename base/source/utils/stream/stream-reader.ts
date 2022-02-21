import { BadRequestError, MaxBytesExceededError } from '#/error';
import { concatArrayBufferViews } from '../binary';
import { isDefined } from '../type-guards';

// eslint-disable-next-line max-statements
export async function readBinaryStream(iterable: AsyncIterable<Uint8Array>, length?: number, maxBytes?: number): Promise<Uint8Array> {
  if (isDefined(length)) {
    const array = new Uint8Array(length);

    if (isDefined(length) && isDefined(maxBytes) && (length > maxBytes)) {
      throw new MaxBytesExceededError(`maximum size of ${maxBytes} bytes exceeded`);
    }

    let bytesWritten = 0;
    for await (const chunk of iterable) {
      if ((bytesWritten + chunk.length) > length) {
        throw new BadRequestError('size of stream is greater than provided length');
      }

      array.set(chunk, bytesWritten);
      bytesWritten += chunk.length;
    }

    if (bytesWritten != length) {
      throw new BadRequestError('size of stream did not match provided length');
    }

    return array;
  }

  let totalLength = 0;
  const chunks: Uint8Array[] = [];

  for await (const chunk of iterable) {
    chunks.push(chunk);
    totalLength += chunk.length;

    if (isDefined(maxBytes) && (totalLength > maxBytes)) {
      throw new MaxBytesExceededError(`maximum size of ${maxBytes} bytes exceeded`);
    }
  }

  if (chunks.length == 0) {
    return new Uint8Array(0);
  }

  return concatArrayBufferViews(chunks, totalLength);
}
