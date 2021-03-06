
import { decodeBase64, encodeBase64, isDefined } from '../../utils';
import type { registerSerializationType } from '../serializer';

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

type TypedArrayConstructor = new (arrayOrArrayBuffer: ArrayLike<number> | ArrayBufferLike) => TypedArray;

const typedArrays: TypedArrayConstructor[] = [
  globalThis.Int8Array,
  globalThis.Uint8Array,
  globalThis.Int16Array,
  globalThis.Uint16Array,
  globalThis.Int32Array,
  globalThis.Uint32Array,
  globalThis.Float32Array,
  globalThis.Float64Array
].filter(isDefined);

export function registerBinaryTypes(register: typeof registerSerializationType): void {
  if (typeof ArrayBuffer != 'undefined') {
    register(ArrayBuffer, encodeBase64, decodeBase64);
  }

  for (const typedArray of typedArrays) {
    register(typedArray, encodeBase64, (data) => new typedArray(decodeBase64(data)));
  }

  if (typeof Buffer != 'undefined') {
    register(Buffer, (buffer) => buffer.toString('base64'), (data) => Buffer.from(data, 'base64'));
  }
}
