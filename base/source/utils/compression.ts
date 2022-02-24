import * as Zlib from 'zlib';
import { encodeBase64, encodeBase64Url } from './base64';
import { decodeText, encodeHex, encodeUtf8 } from './encoding';
import { zBase32Encode } from './z-base32';

export interface CompressionResult {
  toBuffer(): Promise<Uint8Array>;
  toHex(): Promise<string>;
  toBase64(): Promise<string>;
  toBase64Url(): Promise<string>;
  toZBase32(): Promise<string>;
}

export interface DecompressionResult extends CompressionResult {
  toUtf8(): Promise<string>;
}

type Algorithms = 'gzip' | 'brotli' | 'deflate' | 'deflate-raw';

export function compressString(input: string, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: Zlib.ZlibOptions): CompressionResult;
export function compressString(input: string, algorithm: 'brotli', options?: Zlib.BrotliOptions): CompressionResult;
export function compressString(input: string, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): CompressionResult;
export function compressString(input: string, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): CompressionResult {
  const inputBuffer = encodeUtf8(input);
  return compress(inputBuffer, algorithm, options);
}

export function compress(buffer: Zlib.InputType, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: Zlib.ZlibOptions): CompressionResult;
export function compress(buffer: Zlib.InputType, algorithm: 'brotli', options?: Zlib.BrotliOptions): CompressionResult;
export function compress(buffer: Zlib.InputType, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): CompressionResult;
export function compress(buffer: Zlib.InputType, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): CompressionResult {
  const compressedBuffer = _compress(buffer, algorithm, options);

  return {
    toBuffer: async () => compressedBuffer,
    toHex: async () => encodeHex(await compressedBuffer),
    toBase64: async () => encodeBase64(await compressedBuffer),
    toBase64Url: async () => encodeBase64Url(await compressedBuffer),
    toZBase32: async () => zBase32Encode(await compressedBuffer)
  };
}

async function _compress(buffer: Zlib.InputType, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
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
    toHex: async () => encodeHex(await decompressedBuffer),
    toBase64: async () => encodeBase64(await decompressedBuffer),
    toBase64Url: async () => encodeBase64Url(await decompressedBuffer),
    toZBase32: async () => zBase32Encode(await decompressedBuffer),
    toUtf8: async () => decodeText(await decompressedBuffer)
  };
}

async function _decompress(buffer: Zlib.InputType, algorithm: Algorithms, options?: Zlib.ZlibOptions | Zlib.BrotliOptions): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
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
