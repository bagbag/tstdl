import type { TypedOmit } from '#/types/index.js';
import { isString } from '#/utils/type-guards.js';
import { HttpBody, type HttpBodySource } from '../http-body.js';
import { HttpHeaders, type HttpHeadersObject } from '../http-headers.js';
import type { HttpClientRequest, HttpClientRequestObject } from './http-client-request.js';

export type HttpClientResponseObject = TypedOmit<HttpClientResponse, 'hasBody' | 'request' | 'headers' | 'close' | 'asObject'> & {
  request: HttpClientRequestObject,
  headers: HttpHeadersObject
};

export type HttpClientResponseOptions = {
  request: HttpClientRequest,
  statusCode: number,
  statusMessage: string | null,
  headers: HttpHeadersObject | HttpHeaders,
  body: HttpBody | HttpBodySource,
  closeHandler: () => void
};

export class HttpClientResponse {
  private readonly closeHandler: () => void;

  readonly request: HttpClientRequest;
  readonly statusCode: number;
  readonly statusMessage: string | null;
  readonly headers: HttpHeaders;
  readonly body: HttpBody;

  get hasBody(): boolean {
    return this.body.available;
  }

  constructor(options: HttpClientResponseOptions) {
    this.request = options.request;
    this.statusCode = options.statusCode;
    this.statusMessage = (isString(options.statusMessage) && (options.statusMessage.length > 0)) ? options.statusMessage : null;
    this.headers = new HttpHeaders(options.headers);
    this.body = (options.body instanceof HttpBody) ? options.body : new HttpBody(options.body, this.headers);
    this.closeHandler = options.closeHandler;
  }

  close(): void {
    this.closeHandler();
  }

  asObject(): HttpClientResponseObject {
    const obj: HttpClientResponseObject = {
      request: this.request.asObject(),
      statusCode: this.statusCode,
      statusMessage: this.statusMessage,
      headers: this.headers.asObject(),
      body: this.body
    };

    return obj;
  }
}
