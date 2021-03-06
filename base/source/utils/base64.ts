/* eslint-disable no-bitwise */

import type { TypedArray } from '../types';
import { toUint8Array } from './helpers';
import { isDefined } from './type-guards';

export function encodeBase64(array: TypedArray | ArrayBuffer, bytesOffset?: number, length?: number): string {
  if (typeof Buffer != 'undefined') {
    const buffer = Buffer.from(array, bytesOffset, length);
    return buffer.toString('base64');
  }

  return encodeBase64Fallback(array);
}

export function decodeBase64(base64: string): ArrayBuffer {
  if (typeof Buffer != 'undefined') {
    const buffer = Buffer.from(base64, 'base64');
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }

  return decodeBase64Fallback(base64);
}

export function encodeBase64Url(array: TypedArray | ArrayBuffer, bytesOffset?: number, length?: number): string {
  return base64ToBase64Url(encodeBase64(array, bytesOffset, length));
}

export function decodeBase64Url(base64Url: string): ArrayBuffer {
  return decodeBase64(base64UrlToBase64(base64Url));
}

export function base64ToBase64Url(input: string): string {
  return input
    .replace(/=/ug, '') // eslint-disable-line no-div-regex
    .replace(/\+/ug, '-')
    .replace(/\//ug, '_');
}

export function base64UrlToBase64(input: string): string {
  return input.padEnd(input.length + ((4 - (input.length % 4)) % 4), '=')
    .replace(/-/ug, '+')
    .replace(/_/ug, '/');
}

function encodeBase64Fallback(data: TypedArray | ArrayBuffer): string {
  const bytes = toUint8Array(data);

  let nMod3 = 2;
  let base64 = '';
  let nUint24 = 0;

  for (let index = 0; index < bytes.length; index++) {
    nMod3 = index % 3;
    nUint24 |= bytes[index]! << ((16 >>> nMod3) & 24);

    if (nMod3 === 2 || bytes.length - index === 1) {
      base64 += String.fromCharCode(uint6ToBase64((nUint24 >>> 18) & 63), uint6ToBase64((nUint24 >>> 12) & 63), uint6ToBase64((nUint24 >>> 6) & 63), uint6ToBase64(nUint24 & 63));
      nUint24 = 0;
    }
  }

  return base64.substr(0, base64.length - 2 + nMod3) + (nMod3 === 2 ? '' : nMod3 === 1 ? '=' : '==');
}

function decodeBase64Fallback(base64: string, blockSize?: number): Uint8Array {
  const clearedBase64 = base64.replace(/[^A-Za-z0-9+/]/ug, '');
  const inputLength = clearedBase64.length;
  const outputLength = isDefined(blockSize) ? Math.ceil(((inputLength * 3) + 1 >> 2) / blockSize) * blockSize : (inputLength * 3) + 1 >> 2;
  const bytes = new Uint8Array(outputLength);

  let nUint24 = 0;
  let nOutIdx = 0;

  for (let index = 0; index < inputLength; index++) {
    const nMod4 = index & 3;
    nUint24 |= base64ToUint6(clearedBase64.charCodeAt(index)) << 6 * (3 - nMod4);

    if (nMod4 === 3 || inputLength - index === 1) {
      for (let nMod3 = 0; nMod3 < 3 && nOutIdx < outputLength; nMod3++, nOutIdx++) {
        bytes[nOutIdx] = (nUint24 >>> ((16 >>> nMod3) & 24)) & 255;
      }

      nUint24 = 0;
    }
  }

  return bytes;
}

export function utf8ArrayToString(bytes: Uint8Array): string {
  let string = '';

  for (let index = 0; index < bytes.length; index++) {
    const byte = bytes[index]!;

    const charCode = byte > 251 && byte < 254 && index + 5 < bytes.length
      ? ((byte - 252) * 1073741824) + (bytes[++index]! - 128 << 24) + (bytes[++index]! - 128 << 18) + (bytes[++index]! - 128 << 12) + (bytes[++index]! - 128 << 6) + bytes[++index]! - 128
      : byte > 247 && byte < 252 && index + 4 < bytes.length
        ? (byte - 248 << 24) + (bytes[++index]! - 128 << 18) + (bytes[++index]! - 128 << 12) + (bytes[++index]! - 128 << 6) + bytes[++index]! - 128
        : byte > 239 && byte < 248 && index + 3 < bytes.length
          ? (byte - 240 << 18) + (bytes[++index]! - 128 << 12) + (bytes[++index]! - 128 << 6) + bytes[++index]! - 128
          : byte > 223 && byte < 240 && index + 2 < bytes.length
            ? (byte - 224 << 12) + (bytes[++index]! - 128 << 6) + bytes[++index]! - 128
            : byte > 191 && byte < 224 && index + 1 < bytes.length
              ? (byte - 192 << 6) + bytes[++index]! - 128
              : byte;

    string += String.fromCharCode(charCode);
  }

  return string;
}

// eslint-disable-next-line max-lines-per-function, max-statements
export function stringToUtf8Array(string: string): Uint8Array {
  let bytesLength = 0;

  for (let i = 0; i < string.length; i++) {
    const char = string.charCodeAt(i);
    bytesLength += char < 0x80 ? 1 : char < 0x800 ? 2 : char < 0x10000 ? 3 : char < 0x200000 ? 4 : char < 0x4000000 ? 5 : 6;
  }

  const bytes = new Uint8Array(bytesLength);

  for (let byteIndex = 0, charIndex = 0; byteIndex < bytesLength; charIndex++) {
    const char = string.charCodeAt(charIndex);

    if (char < 128) {
      bytes[byteIndex++] = char;
    }
    else if (char < 0x800) {
      bytes[byteIndex++] = 192 + (char >>> 6);
      bytes[byteIndex++] = 128 + (char & 63);
    }
    else if (char < 0x10000) {
      bytes[byteIndex++] = 224 + (char >>> 12);
      bytes[byteIndex++] = 128 + ((char >>> 6) & 63);
      bytes[byteIndex++] = 128 + (char & 63);
    }
    else if (char < 0x200000) {
      bytes[byteIndex++] = 240 + (char >>> 18);
      bytes[byteIndex++] = 128 + ((char >>> 12) & 63);
      bytes[byteIndex++] = 128 + ((char >>> 6) & 63);
      bytes[byteIndex++] = 128 + (char & 63);
    }
    else if (char < 0x4000000) {
      bytes[byteIndex++] = 248 + (char >>> 24);
      bytes[byteIndex++] = 128 + ((char >>> 18) & 63);
      bytes[byteIndex++] = 128 + ((char >>> 12) & 63);
      bytes[byteIndex++] = 128 + ((char >>> 6) & 63);
      bytes[byteIndex++] = 128 + (char & 63);
    }
    else {
      bytes[byteIndex++] = 252 + (char >>> 30);
      bytes[byteIndex++] = 128 + ((char >>> 24) & 63);
      bytes[byteIndex++] = 128 + ((char >>> 18) & 63);
      bytes[byteIndex++] = 128 + ((char >>> 12) & 63);
      bytes[byteIndex++] = 128 + ((char >>> 6) & 63);
      bytes[byteIndex++] = 128 + (char & 63);
    }
  }

  return bytes;
}

function uint6ToBase64(nUint6: number): number {
  return nUint6 < 26
    ? nUint6 + 65
    : nUint6 < 52
      ? nUint6 + 71
      : nUint6 < 62
        ? nUint6 - 4
        : nUint6 === 62
          ? 43
          : nUint6 === 63
            ? 47
            : 65;
}

function base64ToUint6(char: number): number {
  return char > 64 && char < 91
    ? char - 65
    : char > 96 && char < 123
      ? char - 71
      : char > 47 && char < 58
        ? char + 4
        : char === 43
          ? 62
          : char === 47
            ? 63
            : 0;
}
