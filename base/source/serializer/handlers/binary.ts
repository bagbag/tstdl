
import { decodeBase64, encodeBase64, isDefined } from '../../utils';
import { registerSerializationType } from '../serializer';

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

type TypedArrayConstructor = new (arrayOrArrayBuffer: ArrayBufferLike) => TypedArray;

const typedArrays: TypedArrayConstructor[] = [
  globalThis.Int8Array,
  globalThis.Uint8Array,
  globalThis.Uint8ClampedArray,
  globalThis.Int16Array,
  globalThis.Uint16Array,
  globalThis.Int32Array,
  globalThis.Uint32Array,
  globalThis.Float32Array,
  globalThis.Float64Array,
  globalThis.BigInt64Array,
  globalThis.BigUint64Array
].filter(isDefined);

export function registerBinaryTypes(): void {
  if (typeof ArrayBuffer != 'undefined') {
    registerSerializationType(ArrayBuffer, encodeBase64, decodeBase64);
  }

  for (const typedArray of typedArrays) {
    registerSerializationType(typedArray, encodeBase64, (data) => new typedArray(decodeBase64(data)));
  }

  if (typeof Buffer != 'undefined') {
    registerSerializationType(Buffer, (buffer) => buffer.toString('base64'), (data) => Buffer.from(data, 'base64'));
  }
}
