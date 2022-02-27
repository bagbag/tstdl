import type { HttpBodyType } from '#/http/types';
import type { Record } from '#/types';
import { isAsyncIterable } from '#/utils/async-iterable-helpers/is-async-iterable';
import { decompress } from '#/utils/compression';
import { decodeText } from '#/utils/encoding';
import { readBinaryStream } from '#/utils/stream/stream-reader';
import type { HttpClientResponse } from '../http-client-response';

export function getResponseStream(response: HttpClientResponse): AsyncIterable<Uint8Array> {
  if (!isAsyncIterable(response.body)) {
    throw new Error('http client adapter does not support streams');
  }

  return response.body;
}

export async function getResponseBuffer(response: HttpClientResponse): Promise<Uint8Array> {
  if (response.body instanceof Uint8Array) {
    return response.body;
  }

  const stream = getResponseStream(response);
  return readBinaryStream(stream, response.headers.contentLength);
}

export async function getResponseText(response: HttpClientResponse): Promise<string> {
  let buffer = await getResponseBuffer(response);

  if ((response.headers.contentEncoding == 'gzip') || (response.headers.contentEncoding == 'brotli') || (response.headers.contentEncoding == 'deflate')) {
    buffer = await decompress(buffer, response.headers.contentEncoding).toBuffer();
  }

  return decodeText(buffer, response.headers.charset);
}

/**
 * set body of response to correct type (modifies instance)
 * @param response response with either stream of buffer as body
 * @param type type to convert to
 */
// eslint-disable-next-line max-statements
export async function setBody(response: HttpClientResponse, type: HttpBodyType): Promise<void> {
  switch (type) {
    case 'auto': {
      if (response.headers.contentType?.includes('json') == true) {
        await setBody(response, 'json');
      }
      else if (response.headers.contentType?.startsWith('text') == true) {
        await setBody(response, 'text');
      }
      else {
        await setBody(response, 'buffer');
      }

      break;
    }

    case 'text': {
      (response as Record<keyof typeof response>).body = await getResponseText(response);
      break;
    }

    case 'json': {
      const text = await getResponseText(response);
      (response as Record<keyof typeof response>).body = JSON.parse(text);
      break;
    }

    case 'buffer': {
      (response as Record<keyof typeof response>).body = await getResponseBuffer(response);
      break;
    }

    case 'stream': {
      (response as Record<keyof typeof response>).body = getResponseStream(response);
      break;
    }

    case 'none': {
      (response as Record<keyof typeof response>).body = undefined;
      response.close();
      break;
    }

    default: {
      throw new Error(`unsupported responseType ${type as string}`);
    }
  }
}
