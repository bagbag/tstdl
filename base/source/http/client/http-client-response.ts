import type { TypedOmit } from '#/types';
import type { HttpHeadersObject } from '../http-headers';
import { HttpHeaders } from '../http-headers';
import type { HttpBody, HttpBodyType } from '../types';
import type { HttpClientRequest, HttpClientRequestObject } from './http-client-request';

export type ReadBodyOptions = {
  maxBytes?: number
};

export type HttpClientResponseObject = TypedOmit<HttpClientResponse, 'request' | 'headers' | 'close' | 'asObject'> & {
  request: HttpClientRequestObject,
  headers: HttpHeadersObject
};

export type HttpClientResponseOptions<T extends HttpBodyType = HttpBodyType> = {
  request: HttpClientRequest<T>,
  statusCode: number,
  statusMessage: string,
  headers: HttpHeadersObject | HttpHeaders,
  body: HttpBody<T>,
  closeHandler: () => void
};

export class HttpClientResponse<T extends HttpBodyType = HttpBodyType> {
  private readonly closeHandler: () => void;

  readonly request: HttpClientRequest;
  readonly statusCode: number;
  readonly statusMessage: string;
  readonly headers: HttpHeaders;
  readonly body: HttpBody<T>;

  constructor(options: HttpClientResponseOptions<T>) {
    this.request = options.request;
    this.statusCode = options.statusCode;
    this.statusMessage = options.statusMessage;
    this.headers = new HttpHeaders(options.headers);
    this.body = options.body;
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
