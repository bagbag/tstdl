import type { HttpClientRequest } from './http-client-request';
import type { HttpClientResponse } from './http-client-response';

export abstract class HttpClientAdapter {
  /**
   * should return a response with an stream (preferred) or Uint8Array if streams are not supported
   */
  abstract call(request: HttpClientRequest): Promise<HttpClientResponse>;
}
