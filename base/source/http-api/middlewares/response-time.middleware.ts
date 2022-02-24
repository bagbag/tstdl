import type { HttpServerRequest, HttpServerResponse } from '#/http/server';
import { round } from '#/utils/math';
import type { AsyncMiddlerwareHandler } from '#/utils/middleware';
import { Timer } from '#/utils/timer';

export async function responseTimeMiddleware(request: HttpServerRequest, next: AsyncMiddlerwareHandler<HttpServerRequest, HttpServerResponse>): Promise<HttpServerResponse> {
  const timer = new Timer(true);

  const response = await next(request);
  const time = round(timer.milliseconds, 2);

  response.headers.set('X-Response-Time', `${time}ms`);

  return response;
}
