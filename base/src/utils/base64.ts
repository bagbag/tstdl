import { TypedArray } from '../types';

export function encodeBase64(array: TypedArray | ArrayBuffer, bytesOffset?: number, length?: number): string {
  if (typeof Buffer != 'undefined') {
    const buffer = Buffer.from((array as TypedArray).buffer != undefined ? (array as TypedArray).buffer : array, bytesOffset, length);
    return buffer.toString('base64');
  }

  const uint8Array = new Uint8Array(array);
  const chunkSize = 2 ** 15; // arbitrary number
  const arrayLength = uint8Array.length;

  let index = 0;
  let result = '';

  while (index < arrayLength) {
    const slice = uint8Array.subarray(index, Math.min(index + chunkSize, arrayLength));
    result += String.fromCharCode.apply(undefined, [...slice]);
    index += chunkSize;
  }

  return btoa(result);
}

export function decodeBase64(base64: string): ArrayBuffer {
  if (typeof Buffer != 'undefined') {
    const buffer = Buffer.from(base64, 'base64');
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }

  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}
