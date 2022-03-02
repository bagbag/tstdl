import type * as NodeCrypto from 'crypto';

type NodeCryptoType = typeof NodeCrypto;

const bufferSize = 20480;
const bufferBypassThreshold = (bufferSize / 2) + 1;

let nodeCrypto: NodeCryptoType | undefined;

try {
  // eslint-disable-next-line no-eval
  nodeCrypto = eval('require(\'crypto\')') as NodeCryptoType;
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

let randomBytesBuffer = new Uint8Array();
let randomBytesBufferIndex = 0;

/**
 * generate cryptographically strong random bytes
 *
 * if allowUnsafe is true a view on the underlying pool is returned. This can be dangerous as the underlying
 * pool can be read and modified by other callers of {@link getRandomBytes} but improves performance as
 * less memory allocations and system calls are required
 * @param count number of bytes to get
 * @param allowUnsafe whether to allow sharing the underlying pool
 */
export function getRandomBytes(count: number, allowUnsafe: boolean = false): Uint8Array {
  if (!allowUnsafe || (count >= bufferBypassThreshold)) {
    return randomBytes(count);
  }

  if (count > (randomBytesBuffer.byteLength - randomBytesBufferIndex)) {
    randomBytesBuffer = randomBytes(bufferSize);
    randomBytesBufferIndex = 0;
  }

  const end = randomBytesBufferIndex + count;
  const bytes = randomBytesBuffer.subarray(randomBytesBufferIndex, end);
  randomBytesBufferIndex = end;

  return bytes;
}

export function getRandomString(length: number, alphabet: string): string {
  let result = '';

  if (length < 1) {
    return result;
  }

  const bytes = getRandomBytes(length * Uint16Array.BYTES_PER_ELEMENT, true);
  const values = new Uint16Array(bytes.buffer, bytes.byteOffset, length);
  const factor = alphabet.length / (2 ** (Uint16Array.BYTES_PER_ELEMENT * 8));

  for (let i = 0; i < length; i++) {
    const index = Math.floor(values[i]! * factor);
    result += alphabet[index];
  }

  return result;
}
