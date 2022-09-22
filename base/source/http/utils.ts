import { NotSupportedError } from '#/error/not-supported.error';
import type { HttpHeaders } from '#/http/http-headers';
import type { UndefinableJson } from '#/types';
import type { AnyIterable } from '#/utils/any-iterable-iterator';
import { isAnyIterable } from '#/utils/any-iterable-iterator';
import type { CompressionAlgorithm } from '#/utils/compression';
import { decompress, decompressStream } from '#/utils/compression';
import { decodeText, decodeTextStream } from '#/utils/encoding';
import { getReadableStreamFromIterable } from '#/utils/stream/readable-stream-adapter';
import { readBinaryStream } from '#/utils/stream/stream-reader';
import { isArrayBuffer, isBlob, isReadableStream, isUint8Array, isUndefined } from '#/utils/type-guards';

type Body = Uint8Array | Blob | AnyIterable<Uint8Array> | ReadableStream<Uint8Array>;

export function readBodyAsBinaryStream(body: Body, headers: HttpHeaders): ReadableStream<Uint8Array> {
  const rawStream = isReadableStream(body)
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


  if (isUndefined(rawStream)) {
    throw new NotSupportedError('Unsupported stream type.');
  }

  if (isCompressed(headers)) {
    return decompressStream(rawStream, headers.contentEncoding as CompressionAlgorithm);
  }

  return rawStream;
}

export async function readBodyAsBuffer(body: Body, headers: HttpHeaders): Promise<Uint8Array> {
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
    uint8Array = await readBinaryStream(body);
  }
  else {
    throw new NotSupportedError('Unsupported body type.');
  }

  if (isCompressed(headers)) {
    uint8Array = await decompress(uint8Array, headers.contentEncoding as CompressionAlgorithm).toBuffer();
  }

  return uint8Array;
}

export async function readBodyAsText(body: Body, headers: HttpHeaders): Promise<string> {
  const buffer = await readBodyAsBuffer(body, headers);
  return decodeText(buffer, headers.charset);
}

export function readBodyAsTextStream(body: Body, headers: HttpHeaders): ReadableStream<string> {
  const stream = readBodyAsBinaryStream(body, headers);
  return decodeTextStream(stream, headers.charset);
}

export async function readBodyAsJson(body: Body, headers: HttpHeaders): Promise<UndefinableJson> {
  const text = await readBodyAsText(body, headers);
  return JSON.parse(text) as UndefinableJson;
}

export async function readBody(body: Body, headers: HttpHeaders): Promise<string | UndefinableJson | Uint8Array> {
  if (headers.contentType?.includes('json') == true) {
    return readBodyAsJson(body, headers);
  }

  if (headers.contentType?.includes('text') == true) {
    return readBodyAsText(body, headers);
  }

  return readBodyAsBuffer(body, headers);
}

export function readBodyAsStream(body: Body, headers: HttpHeaders): ReadableStream<string> | ReadableStream<Uint8Array> {
  if ((headers.contentType?.includes('json') == true) || (headers.contentType?.includes('text') == true)) {
    return readBodyAsTextStream(body, headers);
  }

  return readBodyAsBinaryStream(body, headers);
}

function isCompressed(headers: HttpHeaders): boolean {
  return ((headers.contentEncoding == 'gzip') || (headers.contentEncoding == 'brotli') || (headers.contentEncoding == 'deflate'));
}
