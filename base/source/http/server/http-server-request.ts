import { UnsupportedMediaTypeError } from '#/error/unsupported-media-type.error';
import type { StringMap, UndefinableJson } from '#/types';
import { decodeText } from '#/utils/encoding';
import { readBinaryStream } from '#/utils/stream/stream-reader';
import { assertDefined, isDefined } from '#/utils/type-guards';
import type { HttpHeaders } from '../http-headers';
import type { HttpQuery } from '../http-query';
import type { HttpMethod } from '../types';

export type ReadBodyOptions = {
  maxBytes?: number
};

export type HttpServerRequestObject = Pick<HttpServerRequest, 'url' | 'method' | 'headers' | 'query' | 'ip'> & {
  body: AsyncIterable<Uint8Array> | undefined,
  context?: StringMap
};

export class HttpServerRequest {
  private readonly body: AsyncIterable<Uint8Array> | undefined;

  readonly url: URL;
  readonly method: HttpMethod;
  readonly headers: HttpHeaders;
  readonly query: HttpQuery;
  readonly ip: string;

  context: StringMap;

  get hasBody(): boolean {
    return isDefined(this.body);
  }

  constructor(data: HttpServerRequestObject) {
    this.url = data.url;
    this.method = data.method;
    this.headers = data.headers;
    this.query = data.query;
    this.ip = data.ip;
    this.body = data.body;

    this.context = data.context ?? {};
  }

  bodyAsStream(): AsyncIterable<Uint8Array> {
    assertDefined(this.body, 'body is not available');
    return this.body;
  }

  async bodyAsBytes(options?: ReadBodyOptions): Promise<Uint8Array> {
    const stream = this.bodyAsStream();
    return readBinaryStream(stream, this.headers.contentLength, options?.maxBytes);
  }

  async bodyAsText(options?: ReadBodyOptions): Promise<string> {
    const bytes = await this.bodyAsBytes(options);
    return decodeText(bytes, this.headers.charset);
  }

  async bodyAsJson<T extends UndefinableJson = UndefinableJson>(options?: ReadBodyOptions): Promise<T> {
    if (this.headers.contentType != 'application/json') {
      throw new UnsupportedMediaTypeError('expected application/json body');
    }

    const text = await this.bodyAsText(options);

    try {
      return JSON.parse(text) as T;
    }
    catch (error: unknown) {
      throw new UnsupportedMediaTypeError(`expected valid application/json body: ${(error as Error).message}`);
    }
  }
}
