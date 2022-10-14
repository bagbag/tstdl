import { MaxBytesExceededError } from '#/error/max-bytes-exceeded.error';
import type { BinaryData } from '#/types';

export function sizeLimitTransform<T extends BinaryData>(maxBytes: number, writableStrategy?: QueuingStrategy<T>, readableStrategy?: QueuingStrategy<T>): TransformStream<T, T> {
  let totalLength = 0;

  return new TransformStream({
    transform(chunk, controller) {
      totalLength += chunk.byteLength;

      if (totalLength > maxBytes) {
        throw MaxBytesExceededError.fromBytes(maxBytes);
      }

      controller.enqueue(chunk);
    }
  }, writableStrategy, readableStrategy);
}
