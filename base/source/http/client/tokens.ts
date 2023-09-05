import { Injector } from '#/injector/injector.js';
import { injectionToken } from '#/injector/token.js';
import type { HttpClientMiddleware } from './middleware.js';

export const HTTP_CLIENT_MIDDLEWARE = injectionToken<HttpClientMiddleware>('HttpClientMiddleware');
export const HTTP_CLIENT_MIDDLEWARES = injectionToken<HttpClientMiddleware[]>('HttpClientMiddlewares');

Injector.register(HTTP_CLIENT_MIDDLEWARES, { useToken: HTTP_CLIENT_MIDDLEWARE, resolveAll: true });
