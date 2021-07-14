import type * as NodeCrypto from 'crypto';
import { assertFunction } from './type-guards';

type NodeCryptoType = typeof NodeCrypto;

let nodeCrypto: NodeCryptoType | undefined;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  nodeCrypto = require(['crypto'][0]!) as NodeCryptoType;
  assertFunction(nodeCrypto.randomBytes);
}
catch {
  // ignore
}

function getNodeCryptoRandomBytes(size: number): Uint8Array {
  const buffer = nodeCrypto!.randomBytes(size);
  const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);

  return uint8Array;
}

function getBrowserCryptoRandomBytes(size: number): Uint8Array {
  const uint8Array = new Uint8Array(size);
  return globalThis.crypto.getRandomValues(uint8Array);
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

export function getRandomString(length: number, alphabet: string): string {
  let result = '';

  if (length < 1) {
    return result;
  }

  const bytes = getRandomBytes(length * 2);
  const array = new Uint16Array(bytes.buffer);
  const maxValue = (2 ** (array.BYTES_PER_ELEMENT * 8)) - 1;
  const factor = alphabet.length / (maxValue + 1);

  for (let i = 0; i < length; i++) {
    const value = array[i]!;
    const index = Math.floor(value * factor);
    result += alphabet[index];
  }

  return result;
}
