import type { BinaryData, TypedArray } from '#/types';
import { assert, isArrayBuffer } from './type-guards';

/**
 * eslint-disable-next-line @typescript-eslint/no-shadow
 * convert to Uint8Array
 * @param data binary data
 * @param clone whether to clone buffer or not
 */
export function toUint8Array(data: BinaryData, clone: boolean = false): Uint8Array { // eslint-disable-line @typescript-eslint/no-shadow
  if (isArrayBuffer(data)) {
    return clone
      ? new Uint8Array(data.slice(0))
      : new Uint8Array(data);
  }

  const { buffer, byteOffset, byteLength } = (data as TypedArray | DataView);

  return clone
    ? new Uint8Array(buffer.slice(byteOffset, byteLength))
    : new Uint8Array(buffer, byteOffset, byteLength);
}

export function concatArrayBuffers(buffers: ArrayBufferLike[]): ArrayBuffer {
  const arrays = buffers.map((buffer) => new Uint8Array(buffer));
  const bytes = concatArrayBufferViews(arrays);

  return bytes.buffer;
}

export function concatArrayBufferViews<T extends ArrayBufferView>(arrays: T[], totalLength?: number): T {
  assert(arrays.length > 0, 'no array provided');

  const type = arrays[0]!.constructor;

  if (typeof Buffer != 'undefined' && type == Buffer) {
    return Buffer.concat(arrays as unknown as Buffer[], totalLength) as unknown as T;
  }

  const totalBytes = totalLength ?? arrays.reduce((sum, array) => sum + array.byteLength, 0);
  const merged = new Uint8Array(totalBytes);

  let currentIndex = 0;
  for (const array of arrays) {
    const uint8Array = toUint8Array(array, false);
    merged.set(uint8Array, currentIndex);
    currentIndex += uint8Array.byteLength;
  }

  return new (type as Uint8ArrayConstructor)(merged.buffer) as unknown as T;
}
