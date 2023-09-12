import { getRandomBytes } from '#/utils/random.js';

export function random32BitSeed(): number {
  return Math.floor(Math.random() * (2 ** 32));
}

export function random32BitSeedCrypto(): number {
  const bytes = getRandomBytes(4);
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
}
