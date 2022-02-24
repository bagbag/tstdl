import type { UndefinableJson } from '#/types';
import { HttpHeaders } from '../http-headers';

export class HttpServerResponse {
  statusCode: number | undefined;
  statusMessage: string | undefined;
  headers: HttpHeaders;
  body: undefined | {
    stream?: AsyncIterable<Uint8Array>,
    buffer?: Uint8Array,
    text?: string,
    json?: UndefinableJson
  };

  constructor(response: Partial<HttpServerResponse> = {}) {
    this.statusCode = response.statusCode;
    this.statusMessage = response.statusMessage;
    this.headers = response.headers ?? new HttpHeaders();
    this.body = response.body;
  }
}
