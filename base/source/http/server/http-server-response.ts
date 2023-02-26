import type { SetCookieOptions } from '#/cookie/cookie.js';
import { formatSetCookie } from '#/cookie/cookie.js';
import type { ServerSentEventsSource } from '#/sse/server-sent-events-source.js';
import type { Record } from '#/types.js';
import { objectEntries } from '#/utils/object/object.js';
import { isDefined } from '#/utils/type-guards.js';
import type { HttpHeadersInput } from '../http-headers.js';
import { HttpHeaders } from '../http-headers.js';

export type SetCookieObject = SetCookieOptions & {
  value: string
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
    events?: ServerSentEventsSource
  }
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
    events?: ServerSentEventsSource
  };

  constructor(response: HttpServerResponseOptions = {}) {
    this.statusCode = response.statusCode;
    this.statusMessage = response.statusMessage;
    this.headers = new HttpHeaders(response.headers);
    this.body = response.body;

    if (isDefined(response.cookies)) {
      for (const [name, options] of objectEntries(response.cookies)) {
        this.headers.append('Set-Cookie', formatSetCookie(name, options.value, options));
      }
    }
  }

  static fromObject(options?: HttpServerResponseOptions): HttpServerResponse {
    return new HttpServerResponse(options);
  }
}
