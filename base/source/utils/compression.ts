import { zBase32Encode } from '#/utils';
import * as Zlib from 'zlib';

export interface CompressionResult {
  toBuffer(): Promise<Buffer>;
  toHex(): Promise<string>;
  toBase64(): Promise<string>;
  toZBase32(): Promise<string>;
  toLatin1(): Promise<string>;
  toString(encoding: BufferEncoding): Promise<string>;
}

export interface DecompressionResult extends CompressionResult {
  toUtf8(): Promise<string>;
}

type Algorithms = 'gzip' | 'brotli' | 'deflate' | 'deflate-raw';

export function compressString(input: string, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: Zlib.ZlibOptions): CompressionResult;
export function compressString(input: string, algorithm: 'brotli', options?: Zlib.BrotliOptions): CompressionResult;
export function compressString(input: string, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): CompressionResult;
export function compressString(input: string, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): CompressionResult {
  const inputBuffer = Buffer.from(input, 'utf8');
  return compress(inputBuffer, algorithm, options);
}

export function compress(buffer: Zlib.InputType, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: Zlib.ZlibOptions): CompressionResult;
export function compress(buffer: Zlib.InputType, algorithm: 'brotli', options?: Zlib.BrotliOptions): CompressionResult;
export function compress(buffer: Zlib.InputType, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): CompressionResult;
export function compress(buffer: Zlib.InputType, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): CompressionResult {
  const compressedBuffer = _compress(buffer, algorithm, options);

  return {
    toBuffer: async () => compressedBuffer,
    toHex: async () => compressedBuffer.then((value) => value.toString('hex')),
    toBase64: async () => compressedBuffer.then((value) => value.toString('base64')),
    toZBase32: async () => compressedBuffer.then(zBase32Encode),
    toLatin1: async () => compressedBuffer.then((value) => value.toString('latin1')),
    toString: async (encoding: BufferEncoding) => compressedBuffer.then((value) => value.toString(encoding))
  };
}

async function _compress(buffer: Zlib.InputType, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const compressor: ((buffer: Zlib.InputType, callback: Zlib.CompressCallback) => void) | ((buffer: Zlib.InputType, options: Zlib.ZlibOptions | Zlib.BrotliOptions, callback: Zlib.CompressCallback) => void) | undefined
      = algorithm == 'gzip' ? Zlib.gzip
        : algorithm == 'brotli' ? Zlib.brotliDecompress
          : algorithm == 'deflate' ? Zlib.deflate
            : algorithm == 'deflate-raw' ? Zlib.deflateRaw // eslint-disable-line @typescript-eslint/no-unnecessary-condition
              : undefined;

    if (compressor == undefined) {
      throw new Error(`unsupported algorithm ${algorithm}`);
    }

    const callback: Zlib.CompressCallback = (error, result) => {
      if (error != undefined) {
        reject(error);
      }
      else {
        resolve(result);
      }
    };

    if (options == undefined) {
      (compressor as (buffer: Zlib.InputType, callback: Zlib.CompressCallback) => void)(buffer, callback);
    }
    else {
      (compressor as (buffer: Zlib.InputType, options: Zlib.ZlibOptions | Zlib.BrotliOptions, callback: Zlib.CompressCallback) => void)(buffer, options, callback);
    }
  });
}

export function decompressString(input: string, encoding: BufferEncoding, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: Zlib.ZlibOptions): DecompressionResult;
export function decompressString(input: string, encoding: BufferEncoding, algorithm: 'brotli', options?: Zlib.BrotliOptions): DecompressionResult;
export function decompressString(input: string, encoding: BufferEncoding, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): DecompressionResult;
export function decompressString(input: string, encoding: BufferEncoding, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): DecompressionResult {
  const inputBuffer = Buffer.from(input, encoding);
  return decompress(inputBuffer, algorithm, options);
}

export function decompress(buffer: Zlib.InputType, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: Zlib.ZlibOptions): DecompressionResult;
export function decompress(buffer: Zlib.InputType, algorithm: 'brotli', options?: Zlib.BrotliOptions): DecompressionResult;
export function decompress(buffer: Zlib.InputType, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): DecompressionResult;
export function decompress(buffer: Zlib.InputType, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): DecompressionResult {
  const decompressedBuffer = _decompress(buffer, algorithm, options);

  return {
    toBuffer: async () => decompressedBuffer,
    toHex: async () => decompressedBuffer.then((value) => value.toString('hex')),
    toBase64: async () => decompressedBuffer.then((value) => value.toString('base64')),
    toZBase32: async () => decompressedBuffer.then(zBase32Encode),
    toLatin1: async () => decompressedBuffer.then((value) => value.toString('latin1')),
    toUtf8: async () => decompressedBuffer.then((value) => value.toString('utf8')),
    toString: async (encoding: BufferEncoding) => decompressedBuffer.then((value) => value.toString(encoding))
  };
}

async function _decompress(buffer: Zlib.InputType, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const decompressor: ((buffer: Zlib.InputType, callback: Zlib.CompressCallback) => void) | ((buffer: Zlib.InputType, options: Zlib.ZlibOptions | Zlib.BrotliOptions, callback: Zlib.CompressCallback) => void) | undefined
      = algorithm == 'gzip' ? Zlib.gunzip
        : algorithm == 'brotli' ? Zlib.brotliDecompress
          : algorithm == 'deflate' ? Zlib.inflate
            : algorithm == 'deflate-raw' ? Zlib.inflateRaw // eslint-disable-line @typescript-eslint/no-unnecessary-condition
              : undefined;

    if (decompressor == undefined) {
      throw new Error(`unsupported algorithm ${algorithm}`);
    }

    const callback: Zlib.CompressCallback = (error, result) => {
      if (error != undefined) {
        reject(error);
      }
      else {
        resolve(result);
      }
    };

    if (options == undefined) {
      (decompressor as (buffer: Zlib.InputType, callback: Zlib.CompressCallback) => void)(buffer, callback);
    }
    else {
      (decompressor as (buffer: Zlib.InputType, options: Zlib.ZlibOptions | Zlib.BrotliOptions, callback: Zlib.CompressCallback) => void)(buffer, options, callback);
    }
  });
}
