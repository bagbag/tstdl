import type { TypedOmit } from '#/types';
import type { HttpBodySource } from '../http-body';
import { HttpBody } from '../http-body';
import type { HttpHeadersObject } from '../http-headers';
import { HttpHeaders } from '../http-headers';
import type { HttpClientRequest, HttpClientRequestObject } from './http-client-request';

export type ReadBodyOptions = {
  maxBytes?: number
};

export type HttpClientResponseObject = TypedOmit<HttpClientResponse, 'request' | 'headers' | 'close' | 'asObject'> & {
  request: HttpClientRequestObject,
  headers: HttpHeadersObject
};

export type HttpClientResponseOptions = {
  request: HttpClientRequest,
  statusCode: number,
  statusMessage: string,
  headers: HttpHeadersObject | HttpHeaders,
  body: HttpBody | HttpBodySource,
  closeHandler: () => void
};

export class HttpClientResponse {
  private readonly closeHandler: () => void;

  readonly request: HttpClientRequest;
  readonly statusCode: number;
  readonly statusMessage: string;
  readonly headers: HttpHeaders;
  readonly body: HttpBody;

  constructor(options: HttpClientResponseOptions) {
    this.request = options.request;
    this.statusCode = options.statusCode;
    this.statusMessage = options.statusMessage;
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
