import { supportsBuffer } from '#/supports.js';
import type { BinaryData } from '#/types/index.js';
import { assert, isArrayBuffer, isUint8Array } from './type-guards.js';

/**
 * Get ArrayBuffer from binary data
 * @param data data to get ArrayBuffer from
 * @param clone force cloning (might still clone if datas underlying buffer is larger than its view)
 */
export function toArrayBuffer(data: BinaryData, clone: boolean = false): ArrayBufferLike {
  if (isArrayBuffer(data)) {
    return clone ? data.slice(0) : data;
  }

  if (!clone && (data.byteOffset == 0) && (data.byteLength == data.buffer.byteLength)) {
    return data.buffer;
  }

  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

/**
 * Convert to Uint8Array
 * @param data binary data
 * @param clone whether to clone buffer or not
 */
export function toUint8Array(data: BinaryData, clone: boolean = false): Uint8Array {
  if (isArrayBuffer(data)) {
    return clone
      ? new Uint8Array(data.slice(0))
      : new Uint8Array(data);
  }

  const { buffer, byteOffset, byteLength } = data;

  return clone
    ? new Uint8Array(buffer.slice(byteOffset, byteOffset + byteLength))
    : new Uint8Array(buffer, byteOffset, byteLength);
}

export function concatArrayBuffers(buffers: readonly ArrayBufferLike[]): ArrayBuffer {
  const arrays = buffers.map((buffer) => new Uint8Array(buffer));
  const bytes = concatArrayBufferViews(arrays);

  return bytes.buffer;
}

export function concatArrayBufferViews(arrays: readonly ArrayBufferView[], totalLength?: number): Uint8Array<ArrayBuffer> {
  assert(arrays.length > 0, 'No array provided.');

  if (supportsBuffer && arrays.every((array) => isUint8Array(array))) {
    return Buffer.concat(arrays as Uint8Array[], totalLength);
  }

  const totalBytes = totalLength ?? arrays.reduce((sum, array) => sum + array.byteLength, 0);
  const merged = new Uint8Array(totalBytes);

  let currentIndex = 0;
  for (const array of arrays) {
    const uint8Array = toUint8Array(array, false);
    merged.set(uint8Array, currentIndex);
    currentIndex += uint8Array.byteLength;
  }

  return merged;
}
