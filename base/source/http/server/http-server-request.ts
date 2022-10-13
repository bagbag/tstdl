import type { StringMap } from '#/types';
import { CookieParser } from '../cookie-parser';
import type { HttpBodySource } from '../http-body';
import { HttpBody } from '../http-body';
import type { HttpHeaders } from '../http-headers';
import type { HttpQuery } from '../http-query';
import type { HttpMethod } from '../types';

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
