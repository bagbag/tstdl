import type { AsyncMiddleware, AsyncMiddlewareNext, ComposedAsyncMiddleware } from '#/utils/middleware.js';
import type { HttpClientRequest } from './http-client-request.js';
import type { HttpClientResponse } from './http-client-response.js';

export type HttpClientMiddlewareContext = { request: HttpClientRequest, response?: HttpClientResponse };
export type HttpClientMiddleware = AsyncMiddleware<HttpClientMiddlewareContext>;
export type HttpClientMiddlewareNext = AsyncMiddlewareNext;
export type ComposedHttpClientMiddleware = ComposedAsyncMiddleware<HttpClientMiddlewareContext>;
