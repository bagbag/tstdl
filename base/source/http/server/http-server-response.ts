import type { SeverSentEvents } from '#/sse';
import type { UndefinableJson } from '#/types';
import type { HttpHeadersInput } from '../http-headers';
import { HttpHeaders } from '../http-headers';

export type HttpServerResponseOptions = {
  statusCode?: number | undefined,
  statusMessage?: string | undefined,
  headers?: HttpHeadersInput | HttpHeaders,
  body?: {
    stream?: ReadableStream<Uint8Array>,
    buffer?: Uint8Array,
    text?: string,
    json?: UndefinableJson,
    events?: SeverSentEvents
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
    json?: UndefinableJson,
    events?: SeverSentEvents
  };

  constructor(response: HttpServerResponseOptions = {}) {
    this.statusCode = response.statusCode;
    this.statusMessage = response.statusMessage;
    this.headers = new HttpHeaders(response.headers);
    this.body = response.body;
  }

  static fromObject(options?: HttpServerResponseOptions): HttpServerResponse {
    return new HttpServerResponse(options);
  }
}
