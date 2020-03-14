import { zBase32Encode } from './z-base32';

type NodeCrypto = typeof import('crypto');

let nodeCrypto: NodeCrypto | undefined;

try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
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

const randomBytes: (size: number) => Uint8Array
  = (nodeCrypto != undefined)
    ? getNodeCryptoRandomBytes
    : getBrowserCryptoRandomBytes;

let randomBytesBufferIndex = 0;
let randomBytesBuffer = new Uint8Array();

export function getRandomBytes(count: number): Uint8Array {
  if (count > (randomBytesBuffer.byteLength - randomBytesBufferIndex)) {
    randomBytesBuffer = randomBytes(Math.max(count, 1024));
    randomBytesBufferIndex = 0;
  }

  const end = randomBytesBufferIndex + count;
  const bytes = randomBytesBuffer.slice(randomBytesBufferIndex, end);
  randomBytesBufferIndex = end;

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
