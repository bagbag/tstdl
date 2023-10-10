import { AssertionError } from '#/errors/assertion.error.js';
import type { BinaryData } from '#/types.js';
import { createArray } from './array/array.js';
import { toUint8Array } from './binary.js';
import { isUndefined } from './type-guards.js';

const byteToHex = createArray(2 ** 8, (i) => i).map((value) => value.toString(16).padStart(2, '0'));
const hexToByte = new Map(byteToHex.map((hex, value) => [hex, value]));

/**
 * encodes text to utf8
 * @param text text to encode
 * @returns utf8 encoded text
 */
export function encodeUtf8(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

/**
 * encodes text stream to utf8 bytes stream
 */
export function encodeUtf8Stream(): TransformStream<string, Uint8Array> {
  return new TextEncoderStream();
}

/**
 * decodes buffer to string
 * @param buffer buffer to decode
 * @param encoding encoding, defaults to utf8
 * @returns decoded string
 */
export function decodeText(buffer: BinaryData, encoding?: string): string {
  const decoder = new TextDecoder(encoding, { fatal: true });
  return decoder.decode(buffer);
}

/**
 * transforms binary stream to string stream
 * @param encoding encoding, defaults to utf8
 * @returns stream of decoded string
 */
export function decodeTextStream(encoding?: string): TransformStream<BinaryData, string> {
  return new TextDecoderStream(encoding, { fatal: true });
}

/**
 * encodes buffer to hex
 * @param buffer buffer to encode
 * @returns hex encoded string
 */
export function encodeHex(buffer: BinaryData): string {
  const bytes = toUint8Array(buffer);
  let result = '';

  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < bytes.length; i++) {
    result += byteToHex[bytes[i]!];
  }

  return result;
}

/**
 * decodes hex string to buffer
 * @param hex hex string to decode
 * @returns decoded buffer
 */
export function decodeHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < hex.length; i += 2) {
    const hexPart = hex.substring(i, i + 2);
    const byte = hexToByte.get(hexPart);

    if (isUndefined(byte)) {
      throw new AssertionError(`invalid hex string at position ${i}`);
    }

    bytes[i / 2] = byte;
  }

  return bytes;
}
