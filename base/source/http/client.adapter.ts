import type { HttpBodyType, HttpClientResponse, NormalizedHttpClientRequest } from './types';

export abstract class HttpClientAdapter {
  abstract call<T extends HttpBodyType>(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<T>>;
  abstract callStream(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<'stream'>>;
}
