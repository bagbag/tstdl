import { round } from '#/utils/math.js';
import { Timer } from '#/utils/timer.js';
import type { ApiGatewayMiddlewareContext, ApiGatewayMiddlewareNext } from '../gateway.js';

export async function responseTimeMiddleware({ response }: ApiGatewayMiddlewareContext, next: ApiGatewayMiddlewareNext): Promise<void> {
  const timer = Timer.startNew();

  await next();
  const time = round(timer.milliseconds, 2);

  response.headers.set('X-Response-Time', `${time}ms`);
}
