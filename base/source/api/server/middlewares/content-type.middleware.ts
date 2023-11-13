import { isDefined } from '#/utils/type-guards.js';
import type { ApiGatewayMiddlewareContext, ApiGatewayMiddlewareNext } from '../gateway.js';

export async function contentTypeMiddleware(context: ApiGatewayMiddlewareContext, next: ApiGatewayMiddlewareNext): Promise<void> {
  await next();

  const { response } = context;

  if (isDefined(response.headers.contentType)) {
    return;
  }

  response.headers.contentType =
    (isDefined(response.body?.json)) ? 'application/json; charset=utf-8'
      : (isDefined(response.body?.text)) ? 'text/plain; charset=utf-8'
        : (isDefined(response.body?.buffer)) ? 'application/octet-stream'
          : (isDefined(response.body?.stream)) ? 'application/octet-stream'
            : (isDefined(response.body?.events)) ? 'text/event-stream'
              : undefined;
}
