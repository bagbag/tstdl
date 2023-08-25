export class HttpClientOptions {
  /**
   * base url for requests when only path is provided
   */
  baseUrl?: string;

  /**
   * enables parsing of response errors with registered error handlers via {@link parseErrorResponse}
   * @default true
   */
  enableErrorHandling?: boolean;
}
