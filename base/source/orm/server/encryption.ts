/**
 * @module
 * Provides utility functions for encrypting and decrypting byte arrays using AES-GCM.
 * It includes versioning to handle potential future changes in the encryption format.
 */
import { DetailsError } from '#/errors/index.js';
import { decrypt, encrypt } from '#/utils/cryptography.js';
import { getRandomBytes } from '#/utils/random.js';
import { assert } from '#/utils/type-guards.js';

/** Current version of the encryption format. */
const encryptionVersion = 1;
/** Number of bytes used to store the encryption version. */
const encryptionVersionBytes = 2;
/** Number of bytes used for the Initialization Vector (IV). */
const ivBytes = 12;

/**
 * Encrypts a byte array using AES-GCM with the provided key.
 * Prepends the encryption version and IV to the resulting ciphertext.
 * @param bytes The byte array to encrypt.
 * @param key The CryptoKey to use for encryption.
 * @returns A promise that resolves to the encrypted byte array (version + IV + ciphertext).
 */
export async function encryptBytes(bytes: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const iv = getRandomBytes(ivBytes);

  const encrypted = await encrypt({ name: 'AES-GCM', iv }, key, bytes).toBuffer();

  const result = new Uint8Array(encryptionVersionBytes + ivBytes + encrypted.byteLength);
  const resultView = new DataView(result.buffer);

  resultView.setUint16(0, encryptionVersion); // Prepend version
  result.set(iv, encryptionVersionBytes); // Prepend IV
  result.set(new Uint8Array(encrypted), encryptionVersionBytes + ivBytes); // Append ciphertext

  return result;
}

/**
 * Decrypts a byte array encrypted with `encryptBytes`.
 * Reads the version and IV from the beginning of the array.
 * @param bytes The byte array to decrypt (must include version and IV).
 * @param key The CryptoKey to use for decryption.
 * @returns A promise that resolves to the original decrypted byte array.
 * @throws {DetailsError} If decryption fails (e.g., wrong key, corrupted data).
 * @throws {Error} If the encryption version is invalid.
 */
export async function decryptBytes(bytes: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const bytesView = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);

  const version = bytesView.getUint16(0);
  const iv = bytes.slice(encryptionVersionBytes, encryptionVersionBytes + ivBytes);

  assert(version == encryptionVersion, 'Invalid encryption version.'); // Check version

  try {
    const decrypted = await decrypt({ name: 'AES-GCM', iv }, key, bytes.slice(encryptionVersionBytes + ivBytes)).toBuffer();
    return new Uint8Array(decrypted);
  }
  catch (error) {
    // Wrap decryption errors for better context
    throw new DetailsError('Decrypt error', error);
  }
}
