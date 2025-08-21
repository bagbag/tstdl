import { Alphabet } from './alphabet.js';

const bufferSize = 20480;
const bufferBypassThreshold = (bufferSize / 2) + 1;

let randomBytesBuffer = new Uint8Array();
let randomBytesBufferIndex = 0;

/**
 * Generate cryptographically secure random bytes
 *
 * if allowUnsafe is true a view on the underlying pool is returned. This can be dangerous as the underlying
 * pool can be read and modified by other callers of {@link getRandomBytes} but improves performance as
 * less memory allocations and system calls are required
 * @param count number of bytes to get
 * @param allowUnsafe whether to allow sharing the underlying pool
 */
export function getRandomBytes(count: number, allowUnsafe: boolean = false): Uint8Array<ArrayBuffer> {
  if (!allowUnsafe || (count >= bufferBypassThreshold)) {
    return globalThis.crypto.getRandomValues(new Uint8Array(count));
  }

  if (count > (randomBytesBuffer.byteLength - randomBytesBufferIndex)) {
    randomBytesBuffer = globalThis.crypto.getRandomValues(new Uint8Array(bufferSize));
    randomBytesBufferIndex = 0;
  }

  const end = randomBytesBufferIndex + count;
  const bytes = randomBytesBuffer.subarray(randomBytesBufferIndex, end);
  randomBytesBufferIndex = end;

  return bytes;
}

/**
 * Generate a cryptographically secure random string (in terms of source of randomness).
 * @param length length of string
 * @param alphabet alphabet to choose characters from. Defaults to {@link Alphabet.LowerUpperCaseNumbers}
 */
export function getRandomString(length: number, alphabet: string = Alphabet.LowerUpperCaseNumbers): string {
  let result = '';

  if (length < 1) {
    return result;
  }

  const bytes = getRandomBytes(length * Uint16Array.BYTES_PER_ELEMENT, true);
  const values = new Uint16Array(bytes.buffer, bytes.byteOffset, length);
  const factor = alphabet.length / (2 ** (Uint16Array.BYTES_PER_ELEMENT * 8));

  for (let i = 0; i < length; i++) {
    const index = Math.floor(values[i]! * factor);
    result += alphabet[index]!;
  }

  return result;
}
