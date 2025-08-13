import type { SetCookieOptions } from '#/cookie/cookie.js';
import { formatSetCookie } from '#/cookie/cookie.js';
import type { ServerSentEventsSource } from '#/sse/server-sent-events-source.js';
import type { Record } from '#/types/index.js';
import { objectEntries } from '#/utils/object/object.js';
import { isDefined } from '#/utils/type-guards.js';
import type { HttpHeadersInput } from '../http-headers.js';
import { HttpHeaders } from '../http-headers.js';

export type SetCookieObject = SetCookieOptions & {
  value: string,
};

export type HttpServerResponseOptions = {
  statusCode?: number | undefined,
  statusMessage?: string | undefined,
  headers?: HttpHeadersInput | HttpHeaders,
  cookies?: Record<string, SetCookieObject>,
  body?: {
    stream?: ReadableStream<Uint8Array>,
    buffer?: Uint8Array,
    text?: string,
    json?: unknown,
    events?: ServerSentEventsSource,
  },
};

export class HttpServerResponse {
  statusCode: number | undefined;
  statusMessage: string | undefined;
  headers: HttpHeaders;
  body: undefined | {
    stream?: ReadableStream<Uint8Array>,
    buffer?: Uint8Array,
    text?: string,
    json?: unknown,
    events?: ServerSentEventsSource,
  };

  constructor(response: HttpServerResponseOptions = {}) {
    this.update(response);
  }

  static fromObject(options?: HttpServerResponseOptions): HttpServerResponse {
    return new HttpServerResponse(options);
  }

  static redirect(url: string, options?: HttpServerResponseOptions) {
    return new HttpServerResponse({
      statusCode: 303,
      ...options,
      headers: {
        Location: url,
        ...options?.headers,
      },
    });
  }

  update(options: HttpServerResponseOptions): void {
    this.statusCode = options.statusCode;
    this.statusMessage = options.statusMessage;
    this.headers = new HttpHeaders(options.headers);
    this.body = options.body;

    if (isDefined(options.cookies)) {
      for (const [name, cookie] of objectEntries(options.cookies)) {
        this.headers.append('Set-Cookie', formatSetCookie(name, cookie.value, cookie));
      }
    }
  }
}

export function redirect(url: string, options?: HttpServerResponseOptions): HttpServerResponse {
  return HttpServerResponse.redirect(url, options);
}
