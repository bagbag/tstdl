
import type { TypedArray } from '#/types';
import { decodeBase64, encodeBase64 } from '../../utils';

type TypedArrayConstructor = new (arrayOrArrayBuffer: ArrayBufferLike) => TypedArray;

export function serializeTypedArray(array: TypedArray): string {
  return encodeBase64(array);
}

export function getTypedArrayDeserializer(constructor: TypedArrayConstructor): (data: string) => TypedArray {
  function deserializeTypedArray(data: string): TypedArray {
    return new constructor(decodeBase64(data));
  }

  return deserializeTypedArray;
}

export function serializeBuffer(buffer: Buffer): string {
  return buffer.toString('base64');
}

export function deserializeBuffer(data: string): Buffer {
  return Buffer.from(data, 'base64');
}
