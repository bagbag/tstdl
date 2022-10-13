import { MaxBytesExceededError } from '#/error/max-bytes-exceeded.error';
import { NotSupportedError } from '#/error/not-supported.error';
import { UnsupportedMediaTypeError } from '#/error/unsupported-media-type.error';
import type { HttpHeaders } from '#/http/http-headers';
import type { UndefinableJson } from '#/types';
import type { AnyIterable } from '#/utils/any-iterable-iterator';
import { isAnyIterable } from '#/utils/any-iterable-iterator';
import type { CompressionAlgorithm } from '#/utils/compression';
import { decompress, decompressStream } from '#/utils/compression';
import { decodeText, decodeTextStream } from '#/utils/encoding';
import { getReadableStreamFromIterable } from '#/utils/stream/readable-stream-adapter';
import { sizeLimitTransform } from '#/utils/stream/size-limited-stream';
import { readBinaryStream } from '#/utils/stream/stream-reader';
import { isArrayBuffer, isBlob, isDefined, isReadableStream, isUint8Array, isUndefined } from '#/utils/type-guards';

type Body = Uint8Array | Blob | AnyIterable<Uint8Array> | ReadableStream<Uint8Array>;

export type ReadBodyOptions = {
  maxBytes?: number
};

export function readBodyAsBinaryStream(body: Body, headers: HttpHeaders, options: ReadBodyOptions = {}): ReadableStream<Uint8Array> {
  ensureSize(headers.contentLength ?? 0, options);

  let stream = isReadableStream(body)
    ? body
    : isBlob(body)
      ? body.stream() as unknown as ReadableStream<Uint8Array>
      : (isUint8Array(body))
        ? new ReadableStream<Uint8Array>({
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
    uint8Array = await readBinaryStream(readBodyAsBinaryStream(body, headers, options), headers.contentLength);
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

export async function readBodyAsJson(body: Body, headers: HttpHeaders, options?: ReadBodyOptions): Promise<UndefinableJson> {
  const text = await readBodyAsText(body, headers, options);

  try {
    return JSON.parse(text) as UndefinableJson;
  }
  catch (error: unknown) {
    throw new UnsupportedMediaTypeError(`Expected valid application/json body: ${(error as Error).message}`);
  }
}

export async function readBody(body: Body, headers: HttpHeaders, options?: ReadBodyOptions): Promise<string | UndefinableJson | Uint8Array> {
  if (headers.contentType?.includes('json') == true) {
    return readBodyAsJson(body, headers, options);
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
