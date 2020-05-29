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

export function getRandomString(length: number, alphabet: string): string {
  let result = '';

  if (length < 1) {
    return result;
  }

  const bytes = getRandomBytes(length * 2);
  const uint16Array = new Uint16Array(bytes.buffer);

  for (let i = 0; i < length; i++) {
    const value = uint16Array[i];
    const index = Math.floor((value / 65535) * alphabet.length);
    result += alphabet[index];
  }

  return result;
}
