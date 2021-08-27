import { DetailsError } from '#/error';
import type { BinaryData, TypedExtract } from '#/types';
import { zBase32Encode } from '#/utils';
import type * as NodeCrypto from 'crypto';
import { encodeBase64, encodeBase64Url } from './base64';
import { decodeText, encodeHex, encodeUtf8 } from './encoding';
import { getRandomBytes } from './random';
import { isDefined, isString, isUndefined } from './type-guards';

export type AesMode = 'CBC' | 'CTR' | 'GCM' | 'KW';
export type EcdsaCurve = 'P-256' | 'P-384' | 'P-521';
export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
export type SymmetricAlgorithm = `AES-${AesMode}`;
export type AsymmetricAlgorithm = 'RSASSA-PKCS1-v1_5' | 'RSA-PSS' | 'RSA-OAEP' | 'ECDSA' | 'ECDH' | 'NODE-DSA' | 'NODE-DH' | 'NODE-ED25519' | 'NODE-ED448';

export type CryptionAlgorithm = Parameters<typeof crypto.subtle.encrypt>[0];
export type SignAlgorithm = Parameters<typeof crypto.subtle.sign>[0];
export type KeyAlgorithm = Parameters<typeof crypto.subtle.generateKey>[0];

export type KeyType = 'raw' | 'pkcs8' | 'spki' | 'jwk';
export type Key = JsonWebKey | BinaryData;

export type ScryptOptions = {
  cost?: number,
  blockSize?: number,
  parallelization?: number,
  maximumMemory?: number
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

export interface HashResult {
  toBuffer(): Promise<ArrayBuffer>;
  toHex(): Promise<string>;
  toBase64(): Promise<string>;
  toBase64Url(): Promise<string>;
  toZBase32(): Promise<string>;
}

export interface SignResult {
  toBuffer(): Promise<ArrayBuffer>;
  toHex(): Promise<string>;
  toBase64(): Promise<string>;
  toBase64Url(): Promise<string>;
  toZBase32(): Promise<string>;
}

let subtle: SubtleCrypto;

try {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  subtle = globalThis?.crypto?.subtle;

  if (isUndefined(subtle)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    subtle = ((require(['crypto'][0]!) as typeof NodeCrypto).webcrypto as any as { subtle: SubtleCrypto }).subtle;
  }
}
catch (error: unknown) {
  if (isUndefined(subtle!)) {
    throw new DetailsError('could not find SubtleCrypto implementation', error);
  }
}

/* eslint-disable @typescript-eslint/unbound-method */
export const deriveBits = subtle.deriveBits;
export const deriveKey = subtle.deriveKey;
export const exportKey = subtle.exportKey;
export const generateKey = subtle.generateKey;
export const importKey = subtle.importKey;
export const unwrapKey = subtle.unwrapKey;
export const wrapKey = subtle.wrapKey;
/* eslint-enable @typescript-eslint/unbound-method */

/**
 * encrypt data
 * @param algorithm algorithm as supported by Web Crypto API
 * @param key key
 * @param data data to encrypt. Encodes string to utf8
 */
export function encrypt(algorithm: CryptionAlgorithm, key: CryptoKey, data: BinaryData | string): CryptionResult {
  const bytes = isString(data) ? encodeUtf8(data) : data;
  const encryptedBuffer = subtle.encrypt(algorithm, key, bytes) as Promise<ArrayBuffer>;

  return {
    toBuffer: async () => encryptedBuffer,
    toHex: async () => encodeHex(await encryptedBuffer),
    toBase64: async () => encodeBase64(await encryptedBuffer),
    toBase64Url: async () => encodeBase64Url(await encryptedBuffer),
    toZBase32: async () => zBase32Encode(await encryptedBuffer)
  };
}

/**
 * decrypt data
 * @param algorithm algorithm as supported by Web Crypto API
 * @param key key
 * @param data data to decrypt
 */
export function decrypt(algorithm: CryptionAlgorithm, key: CryptoKey, bytes: ArrayBuffer): DecryptionResult {
  const decryptedBuffer = subtle.decrypt(algorithm, key, bytes) as Promise<ArrayBuffer>;

  return {
    toBuffer: async () => decryptedBuffer,
    toHex: async () => encodeHex(await decryptedBuffer),
    toBase64: async () => encodeBase64(await decryptedBuffer),
    toBase64Url: async () => encodeBase64Url(await decryptedBuffer),
    toZBase32: async () => zBase32Encode(await decryptedBuffer),
    toUtf8: async () => decodeText(await decryptedBuffer)
  };
}

/**
 * hashes data
 * @param algorithm algorithm as supported by Web Crypto API
 * @param data data to encrypt. Encodes string to utf8
 */
export function digest(algorithm: HashAlgorithmIdentifier, data: BinaryData | string): HashResult {
  const bytes = isString(data) ? encodeUtf8(data) : data;
  const arrayBufferPromise = subtle.digest(algorithm, bytes);

  const result: HashResult = {
    toBuffer: async () => arrayBufferPromise,
    toHex: async () => encodeHex(await arrayBufferPromise),
    toBase64: async () => encodeBase64(await arrayBufferPromise),
    toBase64Url: async () => encodeBase64Url(await arrayBufferPromise),
    toZBase32: async () => zBase32Encode(await arrayBufferPromise)
  };

  return result;
}

/**
 * signs data
 * @param algorithm algorithm as supported by Web Crypto API
 * @param key key
 * @param data data to sign
 */
export function sign(algorithm: SignAlgorithm, key: CryptoKey, data: BinaryData | string): SignResult {
  const bytes = isString(data) ? encodeUtf8(data) : data;

  const arrayBufferPromise = subtle.sign(algorithm, key, bytes);

  const result: HashResult = {
    toBuffer: async () => arrayBufferPromise,
    toHex: async () => encodeHex(await arrayBufferPromise),
    toBase64: async () => encodeBase64(await arrayBufferPromise),
    toBase64Url: async () => encodeBase64Url(await arrayBufferPromise),
    toZBase32: async () => zBase32Encode(await arrayBufferPromise)
  };

  return result;
}

/**
 * verifies data
 * @param algorithm algorithm as supported by Web Crypto API
 * @param key key
 * @param signature signature
 * @param data data to verify using provided signature
 */
export async function verify(algorithm: SignAlgorithm, key: CryptoKey, signature: BinaryData | string, data: BinaryData | string): Promise<boolean> {
  const signatureBytes = isString(signature) ? encodeUtf8(signature) : signature;
  const dataBytes = isString(data) ? encodeUtf8(data) : data;

  return subtle.verify(algorithm, key, signatureBytes, dataBytes);
}

/**
 * imports a HMAC CryptoKey
 * @param algorithm hash algorithm
 * @param key JWK or binary key
 * @param extractable whether the key can be used for exportKey
 */
export async function importHmacKey(algorithm: HashAlgorithmIdentifier, key: Key | string, extractable: boolean = false): Promise<CryptoKey> {
  const _key = isString(key) ? encodeUtf8(key) : key;

  if (isBinaryKey(_key)) {
    return subtle.importKey('raw', _key, { name: 'HMAC', hash: algorithm }, extractable, ['sign', 'verify']);
  }

  return subtle.importKey('jwk', _key, { name: 'HMAC', hash: algorithm }, extractable, ['sign', 'verify']);
}

/**
 * imports a CryptoKey for symmetric encryption
 * @param algorithm symmetric algorithm
 * @param length key length
 * @param key JWK or binary key
 * @param extractable whether the key can be used for exportKey
 */
export async function importSymmetricKey(algorithm: SymmetricAlgorithm, length: 128 | 192 | 256, key: Key | string, extractable: boolean = false): Promise<CryptoKey> {
  const _key = isString(key) ? encodeUtf8(key) : key;

  if (isBinaryKey(_key)) {
    return subtle.importKey('raw', _key, { name: algorithm, length }, extractable, ['encrypt', 'decrypt']);
  }

  return subtle.importKey('jwk', _key, { name: algorithm, length }, extractable, ['encrypt', 'decrypt']);
}

/**
 * imports an ECDSA CryptoKey
 * @param curve ECDSA curve
 * @param key JWK or DER encoded key
 * @param extractable whether the key can be used for exportKey
 */
export async function importEcdsaKey(curve: EcdsaCurve, key: Key | string, extractable: boolean = false): Promise<CryptoKey> {
  const _key = isString(key) ? encodeUtf8(key) : key;

  if (isBinaryKey(_key)) {
    return subtle.importKey('spki', _key, { name: 'ECDSA', namedCurve: curve }, extractable, ['verify']);
  }

  return subtle.importKey('jwk', _key, { name: 'ECDSA', namedCurve: curve }, extractable, ['verify']);
}

/**
 * import a pbkdf2 CryptoKey
 * @param key binary key
 * @param extractable whether the key can be used for exportKey
 */
export async function importPbkdf2Key(key: BinaryData | string, extractable: boolean = false): Promise<CryptoKey> {
  const _key = isString(key) ? encodeUtf8(key) : key;
  return subtle.importKey('raw', _key, { name: 'PBKDF2' }, extractable, ['deriveKey', 'deriveBits']);
}

/**
 * generates a new ECDSA CryptoKeyPair
 * @param curve ECDSA cruve to use
 * @param extractable whether the key can be used for exportKey
 * @param usages whether to generate a key for signing, verifiying or both. Defaults to both
 */
export async function generateEcdsaKey(curve: EcdsaCurve, extractable: boolean = false, usages: TypedExtract<KeyUsage, 'sign' | 'verify'>[] = ['sign', 'verify']): Promise<CryptoKeyPair> {
  return subtle.generateKey({ name: 'ECDSA', namedCurve: curve }, extractable, usages);
}

/**
 * generates a pbkdf2 CryptoKey
 * @param extractable whether the key can be used for exportKey
 */
export async function generatePbkdf2Key(extractable: boolean = false): Promise<CryptoKey> {
  const key = getRandomBytes(16);
  return importPbkdf2Key(key, extractable);
}

function isBinaryKey(key: Key): key is BinaryData {
  return isDefined((key as BinaryData).byteLength);
}
