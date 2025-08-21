import type { BinaryData, TypedExtract } from '#/types/index.js';
import type { ReadonlyTuple } from 'type-fest';
import { createArray } from './array/array.js';
import { encodeBase64, encodeBase64Url } from './base64.js';
import { decodeText, encodeHex, encodeUtf8 } from './encoding.js';
import { getRandomBytes } from './random.js';
import { isArray, isDefined, isString } from './type-guards.js';
import { zBase32Encode } from './z-base32.js';

export type AesMode = 'CBC' | 'CTR' | 'GCM' | 'KW';
export type EcdsaCurve = 'P-256' | 'P-384' | 'P-521';
export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
export type SymmetricAlgorithm = `AES-${AesMode}`;
export type AsymmetricAlgorithm = 'RSASSA-PKCS1-v1_5' | 'RSA-PSS' | 'RSA-OAEP' | 'ECDSA' | 'ECDH' | 'NODE-DSA' | 'NODE-DH' | 'NODE-ED25519' | 'NODE-ED448';

export type CryptionAlgorithm = Parameters<typeof globalThis.crypto.subtle.encrypt>[0];
export type SignAlgorithm = Parameters<typeof globalThis.crypto.subtle.sign>[0];
export type KeyAlgorithm = Parameters<typeof globalThis.crypto.subtle.generateKey>[0];
export type DeriveAlgorithm = Parameters<typeof globalThis.crypto.subtle.deriveBits>['0'];

export type KeyType = 'raw' | 'pkcs8' | 'spki' | 'jwk';
export type Key = JsonWebKey | BinaryData<ArrayBuffer>;

export type ScryptOptions = {
  cost?: number,
  blockSize?: number,
  parallelization?: number,
  maximumMemory?: number,
};

export interface CryptionResult {
  toBuffer(): Promise<ArrayBuffer>;
  toHex(): Promise<string>;
  toBase64(): Promise<string>;
  toBase64Url(): Promise<string>;
  toZBase32(): Promise<string>;
}

export interface DecryptionResult extends CryptionResult {
  toUtf8(): Promise<string>;
}

export type DigestResult = CryptionResult;

export type SignResult = CryptionResult;

/**
 * Encrypt data
 * @param algorithm algorithm as supported by Web Crypto API
 * @param key key
 * @param data data to encrypt. Encodes string to utf8
 */
export function encrypt(algorithm: CryptionAlgorithm, key: CryptoKey, data: BinaryData<ArrayBuffer> | string): CryptionResult {
  const bytes = isString(data) ? encodeUtf8(data) : data;
  const encryptedBuffer = globalThis.crypto.subtle.encrypt(algorithm, key, bytes);

  return {
    toBuffer: async () => await encryptedBuffer,
    toHex: async () => encodeHex(await encryptedBuffer),
    toBase64: async () => encodeBase64(await encryptedBuffer),
    toBase64Url: async () => encodeBase64Url(await encryptedBuffer),
    toZBase32: async () => zBase32Encode(await encryptedBuffer),
  };
}

/**
 * Decrypt data
 * @param algorithm algorithm as supported by Web Crypto API
 * @param key key
 * @param data data to decrypt
 */
export function decrypt(algorithm: CryptionAlgorithm, key: CryptoKey, bytes: BinaryData<ArrayBuffer>): DecryptionResult {
  const decryptedBuffer = globalThis.crypto.subtle.decrypt(algorithm, key, bytes);

  return {
    toBuffer: async () => await decryptedBuffer,
    toHex: async () => encodeHex(await decryptedBuffer),
    toBase64: async () => encodeBase64(await decryptedBuffer),
    toBase64Url: async () => encodeBase64Url(await decryptedBuffer),
    toZBase32: async () => zBase32Encode(await decryptedBuffer),
    toUtf8: async () => decodeText(await decryptedBuffer),
  };
}

/**
 * Hashes data
 * @param algorithm algorithm as supported by Web Crypto API
 * @param data data to encrypt. Encodes string to utf8
 */
export function digest(algorithm: HashAlgorithmIdentifier, data: BinaryData<ArrayBuffer> | string): DigestResult {
  const bytes = isString(data) ? encodeUtf8(data) : data;
  const arrayBufferPromise = globalThis.crypto.subtle.digest(algorithm, bytes);

  const result: DigestResult = {
    toBuffer: async () => await arrayBufferPromise,
    toHex: async () => encodeHex(await arrayBufferPromise),
    toBase64: async () => encodeBase64(await arrayBufferPromise),
    toBase64Url: async () => encodeBase64Url(await arrayBufferPromise),
    toZBase32: async () => zBase32Encode(await arrayBufferPromise),
  };

  return result;
}

/**
 * Signs data
 * @param algorithm algorithm as supported by Web Crypto API
 * @param key key
 * @param data data to sign
 */
export function sign(algorithm: SignAlgorithm, key: CryptoKey, data: BinaryData<ArrayBuffer> | string): SignResult {
  const bytes = isString(data) ? encodeUtf8(data) : data;

  const arrayBufferPromise = globalThis.crypto.subtle.sign(algorithm, key, bytes);

  const result: SignResult = {
    toBuffer: async () => await arrayBufferPromise,
    toHex: async () => encodeHex(await arrayBufferPromise),
    toBase64: async () => encodeBase64(await arrayBufferPromise),
    toBase64Url: async () => encodeBase64Url(await arrayBufferPromise),
    toZBase32: async () => zBase32Encode(await arrayBufferPromise),
  };

  return result;
}

/**
 * Verifies data
 * @param algorithm algorithm as supported by Web Crypto API
 * @param key key
 * @param signature signature
 * @param data data to verify using provided signature
 */
export async function verify(algorithm: SignAlgorithm, key: CryptoKey, signature: BinaryData<ArrayBuffer> | string, data: BinaryData<ArrayBuffer> | string): Promise<boolean> {
  const signatureBytes = isString(signature) ? encodeUtf8(signature) : signature;
  const dataBytes = isString(data) ? encodeUtf8(data) : data;

  return await globalThis.crypto.subtle.verify(algorithm, key, signatureBytes, dataBytes);
}

/**
 * Imports a HMAC CryptoKey
 * @param algorithm hash algorithm
 * @param key JWK or binary key
 * @param extractable whether the key can be used for exportKey
 */
export async function importHmacKey(algorithm: HashAlgorithmIdentifier, key: Key | string, extractable: boolean = false): Promise<CryptoKey> {
  const binaryKey = isString(key) ? encodeUtf8(key) : key;

  if (isBinaryKey(binaryKey)) {
    return await globalThis.crypto.subtle.importKey('raw', binaryKey, { name: 'HMAC', hash: algorithm }, extractable, ['sign', 'verify']);
  }

  return await globalThis.crypto.subtle.importKey('jwk', binaryKey, { name: 'HMAC', hash: algorithm }, extractable, ['sign', 'verify']);
}

/**
 * Imports a CryptoKey for symmetric encryption
 * @param algorithm symmetric algorithm
 * @param length key length
 * @param key JWK or binary key
 * @param extractable whether the key can be used for exportKey
 */
export async function importSymmetricKey(algorithm: SymmetricAlgorithm, length: 128 | 192 | 256, key: Key | string, extractable: boolean = false): Promise<CryptoKey> {
  const binaryKey = isString(key) ? encodeUtf8(key) : key;

  if (isBinaryKey(binaryKey)) {
    return await globalThis.crypto.subtle.importKey('raw', binaryKey, { name: algorithm, length }, extractable, ['encrypt', 'decrypt']);
  }

  return await globalThis.crypto.subtle.importKey('jwk', binaryKey, { name: algorithm, length }, extractable, ['encrypt', 'decrypt']);
}

/**
 * Imports an ECDSA CryptoKey
 * @param curve ECDSA curve
 * @param key JWK or DER encoded key
 * @param extractable whether the key can be used for exportKey
 */
export async function importEcdsaKey(curve: EcdsaCurve, key: Key | string, extractable: boolean = false): Promise<CryptoKey> {
  const binaryKey = isString(key) ? encodeUtf8(key) : key;

  if (isBinaryKey(binaryKey)) {
    return await globalThis.crypto.subtle.importKey('spki', binaryKey, { name: 'ECDSA', namedCurve: curve }, extractable, ['verify']);
  }

  return await globalThis.crypto.subtle.importKey('jwk', binaryKey, { name: 'ECDSA', namedCurve: curve }, extractable, ['verify']);
}

/**
 * Import a pbkdf2 CryptoKey
 * @param key binary key
 * @param extractable whether the key can be used for exportKey
 */
export async function importPbkdf2Key(key: BinaryData<ArrayBuffer> | string, extractable: boolean = false): Promise<CryptoKey> {
  const binaryKey = isString(key) ? encodeUtf8(key) : key;
  return await globalThis.crypto.subtle.importKey('raw', binaryKey, { name: 'PBKDF2' }, extractable, ['deriveKey', 'deriveBits']);
}

/**
 * Generates a new ECDSA CryptoKeyPair
 * @param curve ECDSA cruve to use
 * @param extractable whether the key can be used for exportKey
 * @param usages whether to generate a key for signing, verifiying or both. Defaults to both
 */
export async function generateEcdsaKey(curve: EcdsaCurve, extractable: boolean = false, usages: TypedExtract<KeyUsage, 'sign' | 'verify'>[] = ['sign', 'verify']): Promise<CryptoKeyPair> {
  return await globalThis.crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: curve }, extractable, usages);
}

/**
 * Generates a pbkdf2 CryptoKey
 * @param extractable whether the key can be used for exportKey
 */
export async function generatePbkdf2Key(extractable: boolean = false): Promise<CryptoKey> {
  const key = getRandomBytes(16);
  return await importPbkdf2Key(key, extractable);
}

/**
 * Derive byte array from key
 * @param length length in bytes
 * @param algorithm algorithm to derive with
 * @param baseKey key to derive from
 */
export async function deriveBytes(algorithm: DeriveAlgorithm, baseKey: CryptoKey, length: number): Promise<Uint8Array> {
  const bytes = await globalThis.crypto.subtle.deriveBits(algorithm, baseKey, length * 8);
  return new Uint8Array(bytes);
}

/**
 * Derive multiply byte arrays from key
 * @param algorithm algorithm to derive with
 * @param baseKey key to derive from
 * @param length length of each Uint8Array in bytes, if single number is provided, it is used for every array
 * @param count how many Uint8Arrays to derive
 */
export async function deriveBytesMultiple<const Lengths extends readonly number[]>(algorithm: DeriveAlgorithm, baseKey: CryptoKey, lengths: Lengths): Promise<ReadonlyTuple<Uint8Array<ArrayBuffer>, Lengths['length']>>;
export async function deriveBytesMultiple<const C extends number>(algorithm: DeriveAlgorithm, baseKey: CryptoKey, length: C, count: number): Promise<ReadonlyTuple<Uint8Array<ArrayBuffer>, C>>;
export async function deriveBytesMultiple(algorithm: DeriveAlgorithm, baseKey: CryptoKey, lengthOrLengths: number | number[], countOrNothing?: number): Promise<Uint8Array<ArrayBuffer>[]> {
  const lengths = isArray(lengthOrLengths) ? lengthOrLengths : createArray(countOrNothing!, () => lengthOrLengths);
  const totalBits = lengths.reduce((sum, length) => sum + length, 0) * 8;
  const bytes = await globalThis.crypto.subtle.deriveBits(algorithm, baseKey, totalBits);

  const arrays: Uint8Array<ArrayBuffer>[] = [];

  for (let i = 0; i < bytes.byteLength;) {
    const slice = bytes.slice(i, i + lengths[arrays.length]!);
    const array = new Uint8Array(slice);
    arrays.push(array);

    i += slice.byteLength;
  }

  return arrays;
}

function isBinaryKey(key: Key): key is BinaryData<ArrayBuffer> {
  return isDefined((key as Partial<BinaryData<ArrayBuffer> & JsonWebKey>).byteLength);
}
