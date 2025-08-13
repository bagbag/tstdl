import type { BinaryData } from '#/types/index.js';
import { Alphabet } from './alphabet.js';
import { toUint8Array } from './binary.js';

const alphabet = Alphabet.ZBase32;

const charValueMap = new Map(alphabet.split('').map((char, index) => [char, index]));

export function zBase32Encode(buffer: BinaryData): string {
  const byteView = toUint8Array(buffer);

  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < byteView.byteLength; i++) {
    value = (value << 8) | byteView[i]!;
    bits += 8;

    while (bits >= 5) {
      const quantum = (value >>> (bits - 5)) & 31;
      result += alphabet[quantum]!;
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31]!;
  }

  return result;
}

export function zBase32Decode(input: string): Uint8Array {
  const bytes = new Uint8Array((input.length * 5 / 8) | 0);

  let bits = 0;
  let value = 0;
  let byteIndex = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    const charValue = charValueMap.get(char);

    if (charValue == undefined) {
      throw new Error(`invalid character at index ${i}`);
    }

    value = (value << 5) | charValue;
    bits += 5;

    if (bits >= 8) {
      bytes[byteIndex++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return bytes;
}
