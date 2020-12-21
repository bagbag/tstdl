import { isDefined, zBase32Encode } from '@tstdl/base/utils';
import * as Crypto from 'crypto';

export type CryptionOptions = {
  algorithm: string,
  key: Crypto.BinaryLike,
  iv: Crypto.BinaryLike
};

export type ScryptOptions = {
  cost?: number,
  blockSize?: number,
  parallelization?: number,
  maximumMemory?: number
};

export interface CryptionResult {
  toBuffer(): Promise<Buffer>;
  toHex(): Promise<string>;
  toBase64(): Promise<string>;
  toZBase32(): Promise<string>;
  toString(encoding: BufferEncoding): Promise<string>;
}

export interface DecryptionResult extends CryptionResult {
  toUtf8(): Promise<string>;
}

export interface HashResult {
  toBuffer(): Buffer;
  toHex(): string;
  toBase64(): string;
  toZBase32(): string;
  toString(encoding: Crypto.BinaryToTextEncoding): string;
}

export function encryptString(input: string, options: CryptionOptions): CryptionResult {
  const inputBuffer = Buffer.from(input, 'utf8');
  return encrypt(inputBuffer, options);
}

export function encrypt(input: Buffer | Uint8Array, options: CryptionOptions): CryptionResult {
  const encryptedBuffer = _encrypt(input, options);

  return {
    toBuffer: async () => encryptedBuffer,
    toHex: async () => encryptedBuffer.then((buffer) => buffer.toString('hex')),
    toBase64: async () => encryptedBuffer.then((buffer) => buffer.toString('base64')),
    toZBase32: async () => encryptedBuffer.then(zBase32Encode),
    toString: async (encoding: BufferEncoding) => encryptedBuffer.then((buffer) => buffer.toString(encoding))
  };
}

async function _encrypt(input: Buffer | Uint8Array, options: CryptionOptions): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const cipher = Crypto.createCipheriv(options.algorithm, options.key, options.iv);
      const chunks: Buffer[] = [];

      cipher.on('readable', () => {
        let chunk: Buffer;

        do {
          chunk = cipher.read() as Buffer;

          if (isDefined(chunk)) {
            chunks.push(chunk);
          }
        }
        while (isDefined(chunk));
      });

      cipher.on('end', () => {
        const encryptedBuffer = Buffer.concat(chunks);
        resolve(encryptedBuffer);
      });

      cipher.on('error', (err) => {
        reject(err);
      });

      cipher.write(input, (error) => {
        if (error == undefined) {
          cipher.end();
        }
      });
    }
    catch (error: unknown) {
      reject(error);
    }
  });
}

export function decryptString(input: string, encoding: BufferEncoding, options: CryptionOptions): DecryptionResult {
  const inputBuffer = Buffer.from(input, encoding);
  return decrypt(inputBuffer, options);
}

export function decrypt(input: Buffer | Uint8Array, options: CryptionOptions): DecryptionResult {
  const decryptedBuffer = _decrypt(input, options);

  return {
    toBuffer: async () => decryptedBuffer,
    toHex: async () => decryptedBuffer.then((buffer) => buffer.toString('hex')),
    toBase64: async () => decryptedBuffer.then((buffer) => buffer.toString('base64')),
    toZBase32: async () => decryptedBuffer.then(zBase32Encode),
    toUtf8: async () => decryptedBuffer.then((buffer) => buffer.toString('utf8')),
    toString: async (encoding: BufferEncoding) => decryptedBuffer.then((buffer) => buffer.toString(encoding))
  };
}

async function _decrypt(input: Buffer | Uint8Array, options: CryptionOptions): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const decipher = Crypto.createDecipheriv(options.algorithm, options.key, options.iv);
      const chunks: Buffer[] = [];

      decipher.on('readable', () => {
        let chunk: Buffer;

        do {
          chunk = decipher.read() as Buffer;

          if (isDefined(chunk)) {
            chunks.push(chunk);
          }
        }
        while (isDefined(chunk));
      });

      decipher.on('end', () => {
        const decryptedBuffer = Buffer.concat(chunks);
        resolve(decryptedBuffer);
      });

      decipher.on('error', (err) => {
        reject(err);
      });

      decipher.write(input, (error) => {
        if (error == undefined) {
          decipher.end();
        }
      });
    }
    catch (error: unknown) {
      reject(error);
    }
  });
}

export async function pbkdf2(secret: Crypto.BinaryLike, salt: Crypto.BinaryLike, iterations: number, keyLength: number, digest: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    Crypto.pbkdf2(secret, salt, iterations, keyLength, digest, (error, derivedKey) => {
      if (error != undefined) {
        reject(error);
      }
      else {
        resolve(derivedKey);
      }
    });
  });
}

export async function scrypt(secret: Crypto.BinaryLike, salt: Crypto.BinaryLike, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const convertedOptions = convertScryptOptions(options);
    Crypto.scrypt(secret, salt, keyLength, convertedOptions, (error, derivedKey) => {
      if (error != undefined) {
        reject(error);
      }
      else {
        resolve(derivedKey);
      }
    });
  });
}

export function createHash(algorithm: string, data: Crypto.BinaryLike): HashResult;
export function createHash(algorithm: string, data: string, encoding: Crypto.Encoding): HashResult;
export function createHash(algorithm: string, data: string | Crypto.BinaryLike, encoding?: Crypto.Encoding): HashResult {
  const hasher = Crypto.createHash(algorithm);

  if (typeof data == 'string') {
    hasher.update(data, encoding as Crypto.Encoding);
  }
  else {
    hasher.update(data);
  }

  const result: HashResult = {
    toBuffer: () => hasher.digest(),
    toHex: () => hasher.digest('hex'),
    toBase64: () => hasher.digest('base64'),
    toZBase32: () => zBase32Encode(hasher.digest()),
    toString: (encoding: Crypto.BinaryToTextEncoding) => hasher.digest(encoding) // eslint-disable-line @typescript-eslint/no-shadow
  };

  return result;
}

function convertScryptOptions({ cost, blockSize, parallelization, maximumMemory }: ScryptOptions): Crypto.ScryptOptions {
  return {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: maximumMemory
  };
}
