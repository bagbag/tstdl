import { NotSupportedError } from '#/error/not-supported.error.js';
import { dynamicRequire } from '#/require.js';
import { supportsReadableStream } from '#/supports.js';
import type { ObjectLiteral } from '#/types.js';
import type * as NodeStream from 'node:stream';
import type * as NodeZlib from 'node:zlib';
import type { Stream, Transform } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { isAsyncIterable } from './async-iterable-helpers/is-async-iterable.js';
import { encodeBase64, encodeBase64Url } from './base64.js';
import { decodeText, encodeHex, encodeUtf8 } from './encoding.js';
import { ForwardRef } from './object/forward-ref.js';
import { getReadableStreamFromIterable } from './stream/readable-stream-adapter.js';
import { isFunction } from './type-guards.js';
import { zBase32Encode } from './z-base32.js';

const zlib = ForwardRef.create({ initializer: () => dynamicRequire<typeof NodeZlib>('zlib') });
const nodeStream = ForwardRef.create({ initializer: () => dynamicRequire<typeof NodeStream>('stream') });

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

async function _compress(buffer: NodeZlib.InputType, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const compressor: ((buffer: NodeZlib.InputType, callback: NodeZlib.CompressCallback) => void) | ((buffer: NodeZlib.InputType, options: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions, callback: NodeZlib.CompressCallback) => void) | undefined
      = algorithm == 'gzip' ? zlib.gzip
        : algorithm == 'brotli' ? zlib.brotliDecompress
          : algorithm == 'deflate' ? zlib.deflate
            : algorithm == 'deflate-raw' ? zlib.deflateRaw // eslint-disable-line @typescript-eslint/no-unnecessary-condition
              : undefined;

    if (compressor == undefined) {
      throw new Error(`unsupported algorithm ${algorithm}`);
    }

    const callback: NodeZlib.CompressCallback = (error, result) => {
      if (error != undefined) {
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

export function decompressStream(stream: Stream | ReadableStream, algorithm: 'gzip' | 'deflate' | 'deflate-raw', options?: NodeZlib.ZlibOptions): ReadableStream<Uint8Array>;
export function decompressStream(stream: Stream | ReadableStream, algorithm: 'brotli', options?: NodeZlib.BrotliOptions): ReadableStream<Uint8Array>;
export function decompressStream(stream: Stream | ReadableStream, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): ReadableStream<Uint8Array>;
export function decompressStream(stream: Stream | ReadableStream, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): ReadableStream<Uint8Array> {
  const decompressedStream = _decompressStream(stream, algorithm, options);
  return getReadableStreamFromIterable(decompressedStream);
}

async function _decompress(buffer: NodeZlib.InputType, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const decompressor: ((buffer: NodeZlib.InputType, callback: NodeZlib.CompressCallback) => void) | ((buffer: NodeZlib.InputType, options: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions, callback: NodeZlib.CompressCallback) => void) | undefined
      = algorithm == 'gzip' ? zlib.gunzip
        : algorithm == 'brotli' ? zlib.brotliDecompress
          : algorithm == 'deflate' ? zlib.inflate
            : algorithm == 'deflate-raw' ? zlib.inflateRaw // eslint-disable-line @typescript-eslint/no-unnecessary-condition
              : undefined;

    if (decompressor == undefined) {
      throw new Error(`unsupported algorithm ${algorithm}`);
    }

    const callback: NodeZlib.CompressCallback = (error, result) => {
      if (error != undefined) {
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

async function* _decompressStream(stream: AsyncIterable<Uint8Array> | Stream | ReadableStream, algorithm: CompressionAlgorithm, options?: NodeZlib.ZlibOptions | NodeZlib.BrotliOptions): AsyncIterable<Uint8Array> {
  const decompressor: Transform | undefined
    = algorithm == 'gzip' ? zlib.createGunzip(options)
      : algorithm == 'brotli' ? zlib.createBrotliDecompress(options)
        : algorithm == 'deflate' ? zlib.createInflate(options)
          : algorithm == 'deflate-raw' ? zlib.createInflateRaw(options) // eslint-disable-line @typescript-eslint/no-unnecessary-condition
            : undefined;

  if (decompressor == undefined) {
    throw new Error(`unsupported algorithm ${algorithm}`);
  }

  if (stream instanceof nodeStream.Stream) {
    yield* stream.pipe(decompressor);
  }

  if (isAsyncIterable(stream)) {
    yield* nodeStream.Readable.from(stream).pipe(decompressor);
  }

  if (supportsReadableStream && (stream instanceof ReadableStream)) {
    yield* nodeStream.Readable.fromWeb(stream as NodeReadableStream).pipe(decompressor);
  }

  throw new NotSupportedError(`Stream type (${(stream as (ObjectLiteral | undefined))?.constructor.name ?? (isFunction(stream) ? stream.name : 'unknown type')}) not supported.`);
}
