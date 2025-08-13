import type { StringMap } from '#/types/index.js';
import { CookieParser } from '../cookie-parser.js';
import type { HttpBodySource } from '../http-body.js';
import { HttpBody } from '../http-body.js';
import type { HttpHeaders } from '../http-headers.js';
import type { HttpQuery } from '../http-query.js';
import type { HttpMethod } from '../types.js';

export type HttpServerRequestObject = Pick<HttpServerRequest, 'url' | 'method' | 'headers' | 'query' | 'ip'> & {
  body: HttpBody | HttpBodySource,
  context?: StringMap
};

export class HttpServerRequest {
  readonly url: URL;
  readonly method: HttpMethod;
  readonly headers: HttpHeaders;
  readonly cookies: CookieParser;
  readonly query: HttpQuery;
  readonly body: HttpBody;
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
}
