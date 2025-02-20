import { DetailsError } from '#/errors/index.js';
import { decrypt, encrypt } from '#/utils/cryptography.js';
import { getRandomBytes } from '#/utils/random.js';
import { assert } from '#/utils/type-guards.js';

const encryptionVersion = 1;
const encryptionVersionBytes = 2;
const ivBytes = 12;

export async function encryptBytes(bytes: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const iv = getRandomBytes(ivBytes);

  const encrypted = await encrypt({ name: 'AES-GCM', iv }, key, bytes).toBuffer();

  const result = new Uint8Array(encryptionVersionBytes + ivBytes + encrypted.byteLength);
  const resultView = new DataView(result.buffer);

  resultView.setUint16(0, encryptionVersion);
  result.set(iv, encryptionVersionBytes);
  result.set(new Uint8Array(encrypted), encryptionVersionBytes + ivBytes);

  return result;
}

export async function decryptBytes(bytes: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const bytesView = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);

  const version = bytesView.getUint16(0);
  const iv = bytes.slice(encryptionVersionBytes, encryptionVersionBytes + ivBytes);

  assert(version == encryptionVersion, 'Invalid encryption version.');

  try {
    const decrypted = await decrypt({ name: 'AES-GCM', iv }, key, bytes.slice(encryptionVersionBytes + ivBytes)).toBuffer();
    return new Uint8Array(decrypted);
  }
  catch (error) {
    throw new DetailsError('Decrypt error', error);
  }
}
