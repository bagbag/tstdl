import type { HttpBodyType } from '#/http/types';
import type { Record, UndefinableJson } from '#/types';
import { isAsyncIterable } from '#/utils/async-iterable-helpers/is-async-iterable';
import { decompress } from '#/utils/compression';
import { decodeText } from '#/utils/encoding';
import { readBinaryStream } from '#/utils/stream/stream-reader';
import { isArrayBuffer, isBlob, isUint8Array } from '#/utils/type-guards';
import type { HttpClientResponse } from '../http-client-response';

export function getResponseStream(response: HttpClientResponse): AsyncIterable<Uint8Array> {
  if (!isAsyncIterable(response.body)) {
    throw new Error('http client adapter does not support streams');
  }

  return response.body;
}

export async function getResponseBuffer(response: HttpClientResponse): Promise<Uint8Array> {
  let uint8Array: Uint8Array;

  if (isUint8Array(response.body)) {
    uint8Array = response.body;
  }
  else if (isArrayBuffer(response.body)) {
    uint8Array = new Uint8Array(response.body);
  }
  else if (isBlob(response.body)) {
    const buffer = await response.body.arrayBuffer();
    uint8Array = new Uint8Array(buffer);
  }
  else {
    const stream = getResponseStream(response);
    uint8Array = await readBinaryStream(stream, response.headers.contentLength);
  }

  if ((response.headers.contentEncoding == 'gzip') || (response.headers.contentEncoding == 'brotli') || (response.headers.contentEncoding == 'deflate')) {
    uint8Array = await decompress(uint8Array, response.headers.contentEncoding).toBuffer();
  }

  return uint8Array;
}

export async function getResponseText(response: HttpClientResponse): Promise<string> {
  const buffer = await getResponseBuffer(response);
  return decodeText(buffer, response.headers.charset);
}

export async function getResponseJson(response: HttpClientResponse): Promise<UndefinableJson> {
  const text = await getResponseText(response);
  return JSON.parse(text) as UndefinableJson;
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
      (response as Record<keyof HttpClientResponse>).body = await getResponseText(response);
      break;
    }

    case 'json': {
      (response as Record<keyof HttpClientResponse>).body = await getResponseJson(response);
      break;
    }

    case 'buffer': {
      (response as Record<keyof HttpClientResponse>).body = await getResponseBuffer(response);
      break;
    }

    case 'stream': {
      (response as Record<keyof HttpClientResponse>).body = getResponseStream(response);
      break;
    }

    case 'none': {
      (response as Record<keyof HttpClientResponse>).body = undefined;
      response.close();
      break;
    }

    default: {
      throw new Error(`unsupported responseType ${type as string}`);
    }
  }
}
