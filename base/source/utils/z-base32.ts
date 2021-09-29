/* eslint-disable no-bitwise, @typescript-eslint/no-magic-numbers */

import type { BinaryData } from '#/types';
import { Alphabet } from './alphabet';
import { toUint8Array } from './binary';

const alphabet = Alphabet.ZBase32;

const charValueMap = new Map(alphabet.split('').map((char, index) => [char, index]));

// eslint-disable-next-line max-statements
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
      result += alphabet[quantum];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }

  return result;
}

// eslint-disable-next-line max-statements
export function zBase32Decode(input: string): ArrayBuffer {
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

  return bytes.buffer;
}
