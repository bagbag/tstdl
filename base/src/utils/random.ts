import { zBase32Encode } from './z-base32';

type NodeCrypto = typeof import('crypto');

let nodeCrypto: NodeCrypto | undefined;

try {
  // tslint:disable-next-line: no-require-imports no-var-requires
  nodeCrypto = require('crypto') as NodeCrypto;
}
catch {
  // ignore
}

function getNodeCryptoRandomBytes(size: number): Uint8Array {
  const buffer = (nodeCrypto as NodeCrypto).randomBytes(size);
  const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);

  return uint8Array;
}

function getBrowserCryptoRandomBytes(size: number): Uint8Array {
  const uint8Array = new Uint8Array(size);
  globalThis.crypto.getRandomValues(uint8Array);

  return uint8Array;
}

const randomBytes: (size: number) => Uint8Array =
  (nodeCrypto != undefined)
    ? getNodeCryptoRandomBytes
    : getBrowserCryptoRandomBytes;

let index = 0;
let buffer = new Uint8Array();

export function getRandomBytes(count: number): Uint8Array {
  if (count > (buffer.byteLength - index)) {
    buffer = randomBytes(Math.max(count, 1024));
    index = 0;
  }

  const end = index + count;
  const bytes = buffer.slice(index, end);
  index = end;

  return bytes;
}

export function getRandomString(length: number): string {
  if (length == 0) {
    return '';
  }

  const requiredBytes = Math.floor((length + 1) * 5 / 8);
  const buffer = getRandomBytes(requiredBytes);
  const encodedString = zBase32Encode(buffer);
  const result = encodedString.slice(0, length);

  return result;
}
