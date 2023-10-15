import { supportsBuffer } from '#/supports.js';
import type { BinaryData, Type } from '#/types.js';
import { typeExtends } from './index.js';
import { assert, isArrayBuffer, isFunction, isNumber } from './type-guards.js';

/**
 * Get ArrayBuffer from binary data
 * @param data data to get ArrayBuffer from
 * @param clone force cloning (might still clone if datas underlying buffer is larger than its view)
 */
export function toArrayBuffer(data: BinaryData, clone: boolean = false): ArrayBuffer {
  if (isArrayBuffer(data)) {
    return clone ? data.slice(0) : data;
  }

  if (!clone && (data.byteOffset == 0) && (data.byteLength == data.buffer.byteLength)) {
    return data.buffer;
  }

  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

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

  const { buffer, byteOffset, byteLength } = data;

  return clone
    ? new Uint8Array(buffer.slice(byteOffset, byteOffset + byteLength))
    : new Uint8Array(buffer, byteOffset, byteLength);
}

export function concatArrayBuffers(buffers: ArrayBufferLike[]): ArrayBuffer {
  const arrays = buffers.map((buffer) => new Uint8Array(buffer));
  const bytes = concatArrayBufferViews(arrays);

  return bytes.buffer;
}

export function concatArrayBufferViews<T extends ArrayBufferView>(arrays: T[], totalLength?: number): T;
export function concatArrayBufferViews<T extends ArrayBufferView>(arrays: ArrayBufferView[], targetType: Type<T, [ArrayBufferLike, number, number]>, totalLength?: number): T;
export function concatArrayBufferViews<T extends ArrayBufferView>(arrays: T[], totalLengthOrTargetType?: Type<T, [ArrayBufferLike, number, number]> | number, totalLengthOrNothing?: number): T {
  assert(arrays.length > 0, 'No array provided.');
  const totalLength = isNumber(totalLengthOrTargetType) ? totalLengthOrTargetType : totalLengthOrNothing;
  const type = isFunction(totalLengthOrTargetType) ? totalLengthOrTargetType : arrays[0]!.constructor as Type<T, [ArrayBufferLike, ...any[]]>;

  if (supportsBuffer && typeExtends(type, Uint8Array)) {
    const merged = Buffer.concat(arrays as unknown as Uint8Array[], totalLength);
    return new type(merged.buffer, merged.byteOffset, merged.byteLength);
  }

  const totalBytes = totalLength ?? arrays.reduce((sum, array) => sum + array.byteLength, 0);
  const merged = new Uint8Array(totalBytes);

  let currentIndex = 0;
  for (const array of arrays) {
    const uint8Array = toUint8Array(array, false);
    merged.set(uint8Array, currentIndex);
    currentIndex += uint8Array.byteLength;
  }

  return new type(merged.buffer, merged.byteOffset, merged.byteLength);
}
