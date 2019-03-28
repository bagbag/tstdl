import * as Crypto from 'crypto';

export type CryptionOptions = {
  algorithm: string,
  key: Crypto.BinaryLike,
  iv: Crypto.BinaryLike
};

export interface CryptionResult {
  toBuffer(): Buffer;
  toHex(): string;
  toBase64(): string;
  toLatin1(): string;
}

export interface DecryptionResult extends CryptionResult {
  toUtf8(): string;
}

export interface HashResult {
  toBuffer(): Buffer;
  toHex(): string;
  toBase64(): string;
  toLatin1(): string;
}

export async function encryptString(input: string, options: CryptionOptions): Promise<CryptionResult> {
  const inputBuffer = Buffer.from(input, 'utf8');
  return encrypt(inputBuffer, options);
}

export async function encrypt(input: Buffer | Uint8Array, options: CryptionOptions): Promise<CryptionResult> {
  return new Promise<CryptionResult>((resolve, reject) => {
    try {
      const cipher = Crypto.createCipheriv(options.algorithm, options.key, options.iv);
      const chunks: Buffer[] = [];

      cipher.on('readable', () => {
        let chunk: Buffer;

        do {
          chunk = cipher.read() as Buffer;

          if (chunk != undefined) {
            chunks.push(chunk);
          }
        }
        while (chunk != undefined);
      });

      cipher.on('end', () => {
        const encrypted = Buffer.concat(chunks);

        const result: CryptionResult = {
          toBuffer: () => encrypted,
          toHex: () => encrypted.toString('hex'),
          toBase64: () => encrypted.toString('base64'),
          toLatin1: () => encrypted.toString('latin1')
        };

        resolve(result);
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
    catch (error) {
      reject(error);
    }
  });
}

export async function decryptString(input: string, encoding: 'hex' | 'base64' | 'latin1' | 'utf8', options: CryptionOptions): Promise<DecryptionResult> {
  const inputBuffer = Buffer.from(input, encoding);
  return decrypt(inputBuffer, options);
}

export async function decrypt(input: Buffer | Uint8Array, options: CryptionOptions): Promise<DecryptionResult> {
  return new Promise<DecryptionResult>(async (resolve, reject) => {
    try {
      const decipher = Crypto.createDecipheriv(options.algorithm, options.key, options.iv);
      const chunks: Buffer[] = [];

      decipher.on('readable', () => {
        let chunk: Buffer;

        do {
          chunk = decipher.read() as Buffer;

          if (chunk != undefined) {
            chunks.push(chunk);
          }
        }
        while (chunk != undefined);
      });

      decipher.on('end', () => {
        const decrypted = Buffer.concat(chunks);

        const result: DecryptionResult = {
          toBuffer: () => decrypted,
          toHex: () => decrypted.toString('hex'),
          toBase64: () => decrypted.toString('base64'),
          toLatin1: () => decrypted.toString('latin1'),
          toUtf8: () => decrypted.toString('utf8')
        };

        resolve(result);
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
    catch (error) {
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

export function createHash(algorithm: string, data: Crypto.BinaryLike): HashResult;
export function createHash(algorithm: string, data: string, encoding: Crypto.Utf8AsciiLatin1Encoding): HashResult;
export function createHash(algorithm: string, data: string | Crypto.BinaryLike, encoding?: Crypto.Utf8AsciiLatin1Encoding): HashResult {
  const hasher = Crypto.createHash(algorithm);

  if (typeof data == 'string') {
    hasher.update(data, encoding as Crypto.Utf8AsciiLatin1Encoding);
  }
  else {
    hasher.update(data);
  }

  const result: HashResult = {
    toBuffer: () => hasher.digest(),
    toHex: () => hasher.digest('hex'),
    toBase64: () => hasher.digest('base64'),
    toLatin1: () => hasher.digest('latin1')
  };

  return result;
}
