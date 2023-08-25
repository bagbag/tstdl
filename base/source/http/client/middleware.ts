import type { AsyncMiddleware, AsyncMiddlewareHandler, AsyncMiddlewareNext } from '#/utils/middleware.js';
import type { HttpClientRequest } from './http-client-request.js';
import type { HttpClientResponse } from './http-client-response.js';

export type HttpClientHandler = AsyncMiddlewareHandler<HttpClientRequest, HttpClientResponse>;
export type HttpClientMiddleware = AsyncMiddleware<HttpClientRequest, HttpClientResponse>;
export type HttpClientMiddlewareNext = AsyncMiddlewareNext<HttpClientRequest, HttpClientResponse>;
