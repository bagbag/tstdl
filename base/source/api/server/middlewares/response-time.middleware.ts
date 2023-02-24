import type { HttpServerRequest, HttpServerResponse } from '#/http/server/index.js';
import { round } from '#/utils/math.js';
import { Timer } from '#/utils/timer.js';
import type { ApiGatewayMiddlewareNext } from '../gateway.js';

export async function responseTimeMiddleware(request: HttpServerRequest, next: ApiGatewayMiddlewareNext): Promise<HttpServerResponse> {
  const timer = new Timer(true);

  const response = await next(request);
  const time = round(timer.milliseconds, 2);

  response.headers.set('X-Response-Time', `${time}ms`);

  return response;
}
