import { UnsupportedMediaTypeError } from '#/error/unsupported-media-type.error';
import type { StringMap, UndefinableJson } from '#/types';
import { decodeText } from '#/utils/encoding';
import { readBinaryStream } from '#/utils/stream/stream-reader';
import { CookieParser } from '../cookie-parser';
import type { HttpBodySource } from '../http-body';
import { HttpBody } from '../http-body';
import type { HttpHeaders } from '../http-headers';
import type { HttpQuery } from '../http-query';
import type { HttpMethod } from '../types';

export type ReadBodyOptions = {
  maxBytes?: number
};

export type HttpServerRequestObject = Pick<HttpServerRequest, 'url' | 'method' | 'headers' | 'query' | 'ip'> & {
  body: HttpBody | HttpBodySource,
  context?: StringMap
};

export class HttpServerRequest {
  private readonly body: HttpBody;

  readonly url: URL;
  readonly method: HttpMethod;
  readonly headers: HttpHeaders;
  readonly cookies: CookieParser;
  readonly query: HttpQuery;
  readonly ip: string;

  context: StringMap;

  get hasBody(): boolean {
    return this.body.available;
  }

  constructor(data: HttpServerRequestObject) {
    this.url = data.url;
    this.method = data.method;
    this.headers = data.headers;
    this.cookies = new CookieParser(this.headers);
    this.query = data.query;
    this.ip = data.ip;
    this.body = (data.body instanceof HttpBody) ? data.body : new HttpBody(data.body, this.headers);

    this.context = data.context ?? {};
  }

  bodyAsStream(): ReadableStream<Uint8Array> {
    return this.body.readAsBinaryStream();
  }

  async bodyAsBytes(options?: ReadBodyOptions): Promise<Uint8Array> {
    const stream = this.body.readAsBinaryStream();
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
