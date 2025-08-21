import { match, P } from 'ts-pattern';

import { isDefined } from '#/utils/type-guards.js';
import type { ApiGatewayMiddlewareContext, ApiGatewayMiddlewareNext } from '../gateway.js';

export async function contentTypeMiddleware(context: ApiGatewayMiddlewareContext, next: ApiGatewayMiddlewareNext): Promise<void> {
  await next();

  const { response } = context;

  if (isDefined(response.headers.contentType)) {
    return;
  }

  response.headers.contentType = match(response.body)
    .with({ json: P.select(P.when(isDefined)) }, () => 'application/json; charset=utf-8')
    .with({ text: P.select(P.nonNullable) }, () => 'text/plain; charset=utf-8')
    .with({ buffer: P.select(P.nonNullable) }, () => 'application/octet-stream')
    .with({ stream: P.select(P.nonNullable) }, () => 'application/octet-stream')
    .with({ events: P.select(P.nonNullable) }, () => 'text/event-stream')
    .otherwise(() => undefined);
}
