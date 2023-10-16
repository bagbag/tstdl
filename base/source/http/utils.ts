import { MaxBytesExceededError } from '#/errors/max-bytes-exceeded.error.js';
import { NotSupportedError } from '#/errors/not-supported.error.js';
import { UnsupportedMediaTypeError } from '#/errors/unsupported-media-type.error.js';
import type { HttpHeaders } from '#/http/http-headers.js';
import type { UndefinableJson } from '#/types.js';
import type { AnyIterable } from '#/utils/any-iterable-iterator.js';
import { isAnyIterable } from '#/utils/any-iterable-iterator.js';
import type { CompressionAlgorithm } from '#/utils/compression.js';
import { decompress, decompressStream } from '#/utils/compression.js';
import { decodeText, decodeTextStream } from '#/utils/encoding.js';
import { getReadableStreamFromIterable } from '#/utils/stream/readable-stream-adapter.js';
import { sizeLimitTransform } from '#/utils/stream/size-limited-stream.js';
import { readBinaryStream } from '#/utils/stream/stream-reader.js';
import { isArrayBuffer, isBlob, isDefined, isReadableStream, isUint8Array, isUndefined } from '#/utils/type-guards.js';

type Body = Uint8Array | Blob | AnyIterable<Uint8Array> | ReadableStream<Uint8Array>;

export type ReadBodyOptions = {
  maxBytes?: number
};

export type ReadBodyAsJsonOptions = ReadBodyOptions & {
  fallbackToText?: boolean
};

export function readBodyAsBinaryStream(body: Body, headers: HttpHeaders, options: ReadBodyOptions = {}): ReadableStream<Uint8Array> {
  ensureSize(headers.contentLength ?? 0, options);

  let stream = isReadableStream(body)
    ? body
    : isBlob(body)
      ? body.stream() as unknown as ReadableStream<Uint8Array>
      : (isUint8Array(body))
        ? new ReadableStream({
          type: 'bytes',
          start: (controller) => {
            controller.enqueue(body);
            controller.close();
          }
        })
        : isAnyIterable(body)
          ? getReadableStreamFromIterable(body)
          : undefined;

  if (isUndefined(stream)) {
    throw new NotSupportedError('Unsupported stream type.');
  }

  if (isCompressed(headers)) {
    stream = decompressStream(stream, headers.contentEncoding as CompressionAlgorithm);
  }

  if (isDefined(options.maxBytes)) {
    stream = stream.pipeThrough(sizeLimitTransform(options.maxBytes));
  }

  return stream;
}

export async function readBodyAsBuffer(body: Body, headers: HttpHeaders, options: ReadBodyOptions = {}): Promise<Uint8Array> {
  ensureSize(headers.contentLength ?? 0, options);

  let uint8Array: Uint8Array;

  if (isUint8Array(body)) {
    uint8Array = body;
  }
  else if (isArrayBuffer(body)) {
    uint8Array = new Uint8Array(body);
  }
  else if (isBlob(body)) {
    const buffer = await body.arrayBuffer();
    uint8Array = new Uint8Array(buffer);
  }
  else if (isReadableStream(body) || isAnyIterable(body)) {
    uint8Array = await readBinaryStream(readBodyAsBinaryStream(body, headers, options), { length: headers.contentLength });
  }
  else {
    throw new NotSupportedError('Unsupported body type.');
  }

  if (isCompressed(headers)) {
    uint8Array = await decompress(uint8Array, headers.contentEncoding as CompressionAlgorithm).toBuffer();
  }

  ensureSize(uint8Array.byteLength, options);
  return uint8Array;
}

export async function readBodyAsText(body: Body, headers: HttpHeaders, options?: ReadBodyOptions): Promise<string> {
  const buffer = await readBodyAsBuffer(body, headers, options);
  return decodeText(buffer, headers.charset);
}

export function readBodyAsTextStream(body: Body, headers: HttpHeaders, options?: ReadBodyOptions): ReadableStream<string> {
  const stream = readBodyAsBinaryStream(body, headers, options);
  return stream.pipeThrough(decodeTextStream(headers.charset));
}

export async function readBodyAsJson(body: Body, headers: HttpHeaders, options?: ReadBodyAsJsonOptions): Promise<UndefinableJson> {
  const text = await readBodyAsText(body, headers, options);

  try {
    return JSON.parse(text) as UndefinableJson;
  }
  catch (error: unknown) {
    if (options?.fallbackToText == true) {
      return text;
    }

    throw new UnsupportedMediaTypeError(`Expected valid application/json body: ${(error as Error).message}`);
  }
}

export async function readBody(body: Body, headers: HttpHeaders, options?: ReadBodyOptions): Promise<string | UndefinableJson | Uint8Array> {
  if (headers.contentType?.includes('json') == true) {
    return readBodyAsJson(body, headers, { ...options, fallbackToText: true });
  }

  if (headers.contentType?.includes('text') == true) {
    return readBodyAsText(body, headers, options);
  }

  return readBodyAsBuffer(body, headers, options);
}

export function readBodyAsStream(body: Body, headers: HttpHeaders, options?: ReadBodyOptions): ReadableStream<string> | ReadableStream<Uint8Array> {
  if ((headers.contentType?.includes('json') == true) || (headers.contentType?.includes('text') == true)) {
    return readBodyAsTextStream(body, headers, options);
  }

  return readBodyAsBinaryStream(body, headers, options);
}

function isCompressed(headers: HttpHeaders): boolean {
  return ((headers.contentEncoding == 'gzip') || (headers.contentEncoding == 'brotli') || (headers.contentEncoding == 'deflate'));
}

function ensureSize(length: number, options: ReadBodyOptions): void {
  if (isDefined(options.maxBytes) && (length > options.maxBytes)) {
    throw MaxBytesExceededError.fromBytes(options.maxBytes);
  }
}
