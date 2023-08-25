import { injectionToken } from '#/injector/token.js';
import type { HttpClientMiddleware } from './middleware.js';

export const HTTP_CLIENT_MIDDLEWARE = injectionToken<HttpClientMiddleware>('HttpClientMiddleware');
