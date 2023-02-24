import type { HttpClientMiddleware } from './http-client.js';

export class HttpClientOptions {
  /**
   * base url for requests when only path is provided
   */
  baseUrl?: string;

  /**
   * middlewares to add
   */
  middleware?: HttpClientMiddleware[];

  /**
   * enables parsing of response errors with registered error handlers via {@link parseErrorResponse}
   * @default true
   */
  enableErrorHandling?: boolean;
}
