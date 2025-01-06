import type * as NodeStream from 'node:stream';
import type * as NodeZlib from 'node:zlib';

import { dynamicImport } from '#/import.js';
import { encodeBase64, encodeBase64Url } from './base64.js';
import { decodeText, encodeHex, encodeUtf8 } from './encoding.js';
import { readableStreamFromPromise } from './stream/readable-stream-from-promise.js';
import { assertDefined, isNotNullOrUndefined } from './type-guards.js';
import { zBase32Encode } from './z-base32.js';

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

export type CompressionAlgorithm = 'gzip' | 'brotli' | 'deflate' | 'deflate-raw';

export function compressString(input: string, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: NodeZlib.ZlibOptions): CompressionResult;
export function compressString(input: string, algorithm: 'brotli', options?: NodeZlib.BrotliOptions): CompressionResult;
export function compressString(input: string, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): CompressionResult;
export function compressString(input: string, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): CompressionResult {
  const inputBuffer = encodeUtf8(input);
  return compress(inputBuffer, algorithm, options);
}

export function compress(buffer: NodeZlib.InputType, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: NodeZlib.ZlibOptions): CompressionResult;
export function compress(buffer: NodeZlib.InputType, algorithm: 'brotli', options?: NodeZlib.BrotliOptions): CompressionResult;
export function compress(buffer: NodeZlib.InputType, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): CompressionResult;
export function compress(buffer: NodeZlib.InputType, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): CompressionResult {
  const compressedBuffer = _compress(buffer, algorithm, options);

  return {
    toBuffer: async () => compressedBuffer,
    toHex: async () => encodeHex(await compressedBuffer),
    toBase64: async () => encodeBase64(await compressedBuffer),
    toBase64Url: async () => encodeBase64Url(await compressedBuffer),
    toZBase32: async () => zBase32Encode(await compressedBuffer)
  };
}

const compressFunction = {
  'gzip': 'gzip' satisfies keyof typeof NodeZlib,
  'brotli': 'brotliCompress' satisfies keyof typeof NodeZlib,
  'deflate': 'deflate' satisfies keyof typeof NodeZlib,
  'deflate-raw': 'deflateRaw' satisfies keyof typeof NodeZlib
} as const;

async function _compress(buffer: NodeZlib.InputType, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): Promise<Uint8Array> {
  const zlib = await dynamicImport<typeof NodeZlib>('zlib');
  const compressor = zlib[compressFunction[algorithm]];
  assertDefined(compressor, `Unsupported algorithm ${algorithm}`);

  return new Promise<Uint8Array>((resolve, reject) => {
    const callback: NodeZlib.CompressCallback = (error, result) => {
      if (isNotNullOrUndefined(error)) {
        reject(error);
      }
      else {
        resolve(result);
      }
    };

    if (options == undefined) {
      (compressor as (buffer: NodeZlib.InputType, callback: NodeZlib.CompressCallback) => void)(buffer, callback);
    }
    else {
      (compressor as (buffer: NodeZlib.InputType, options: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions, callback: NodeZlib.CompressCallback) => void)(buffer, options, callback);
    }
  });
}

export function decompressString(input: string, encoding: BufferEncoding, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: NodeZlib.ZlibOptions): DecompressionResult;
export function decompressString(input: string, encoding: BufferEncoding, algorithm: 'brotli', options?: NodeZlib.BrotliOptions): DecompressionResult;
export function decompressString(input: string, encoding: BufferEncoding, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): DecompressionResult;
export function decompressString(input: string, encoding: BufferEncoding, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): DecompressionResult {
  const inputBuffer = Buffer.from(input, encoding);
  return decompress(inputBuffer, algorithm, options);
}

export function decompress(buffer: NodeZlib.InputType, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: NodeZlib.ZlibOptions): DecompressionResult;
export function decompress(buffer: NodeZlib.InputType, algorithm: 'brotli', options?: NodeZlib.BrotliOptions): DecompressionResult;
export function decompress(buffer: NodeZlib.InputType, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): DecompressionResult;
export function decompress(buffer: NodeZlib.InputType, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): DecompressionResult {
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

export function decompressStream(stream: NodeStream.Readable | ReadableStream, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: NodeZlib.ZlibOptions): ReadableStream<Uint8Array>;
export function decompressStream(stream: NodeStream.Readable | ReadableStream, algorithm: 'brotli', options?: NodeZlib.BrotliOptions): ReadableStream<Uint8Array>;
export function decompressStream(stream: NodeStream.Readable | ReadableStream, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): ReadableStream<Uint8Array>;
export function decompressStream(stream: NodeStream.Readable | ReadableStream, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): ReadableStream<Uint8Array> {
  const streamPromise = _decompressStream(stream, algorithm, options);
  return readableStreamFromPromise(streamPromise);
}

const decompressFunction = {
  'gzip': 'gunzip' satisfies keyof typeof NodeZlib,
  'brotli': 'brotliDecompress' satisfies keyof typeof NodeZlib,
  'deflate': 'inflate' satisfies keyof typeof NodeZlib,
  'deflate-raw': 'inflateRaw' satisfies keyof typeof NodeZlib
} as const;

async function _decompress(buffer: NodeZlib.InputType, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): Promise<Uint8Array> {
  const zlib = await dynamicImport<typeof NodeZlib>('zlib');
  const decompressor = zlib[decompressFunction[algorithm]];
  assertDefined(decompressor, `Unsupported algorithm ${algorithm}`);

  return new Promise<Uint8Array>((resolve, reject) => {
    const callback: NodeZlib.CompressCallback = (error, result) => {
      if (isNotNullOrUndefined(error)) {
        reject(error);
      }
      else {
        resolve(result);
      }
    };

    if (options == undefined) {
      (decompressor as (buffer: NodeZlib.InputType, callback: NodeZlib.CompressCallback) => void)(buffer, callback);
    }
    else {
      (decompressor as (buffer: NodeZlib.InputType, options: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions, callback: NodeZlib.CompressCallback) => void)(buffer, options, callback);
    }
  });
}

const decompressStreamFunction = {
  'gzip': 'createGunzip' satisfies keyof typeof NodeZlib,
  'brotli': 'createBrotliDecompress' satisfies keyof typeof NodeZlib,
  'deflate': 'createInflate' satisfies keyof typeof NodeZlib,
  'deflate-raw': 'createInflateRaw' satisfies keyof typeof NodeZlib
} as const;

async function _decompressStream(stream: NodeStream.Readable | ReadableStream, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): Promise<ReadableStream<Uint8Array>> {
  const zlib = await dynamicImport<typeof NodeZlib>('zlib');
  const nodeStream = await dynamicImport<typeof NodeStream>('stream');

  const nodeDecompressor = zlib[decompressStreamFunction[algorithm]](options);
  assertDefined(nodeDecompressor, `Unsupported algorithm ${algorithm}`);

  const decompressor = nodeStream.Transform.toWeb(nodeDecompressor) as TransformStream<Uint8Array, Uint8Array>;

  if (stream instanceof nodeStream.Readable) {
    return (nodeStream.Readable.toWeb(stream) as ReadableStream<Uint8Array>).pipeThrough(decompressor);
  }

  return stream.pipeThrough(decompressor);
}
