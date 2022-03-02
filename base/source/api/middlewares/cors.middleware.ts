import type { HttpServerRequest, HttpServerResponse } from '#/http/server';
import type { AsyncMiddlewareNext } from '#/utils/middleware';
import { isDefined, isUndefined } from '#/utils/type-guards';
import type { ApiGatewayMiddlewareContext } from '../gateway';

export async function corsMiddleware(request: HttpServerRequest, next: AsyncMiddlewareNext<HttpServerRequest, HttpServerResponse>, context: ApiGatewayMiddlewareContext): Promise<HttpServerResponse> {
  const response = await next(request);

  if (isUndefined(context.endpoint.definition.cors)) {
    return response;
  }

  const allowMethods = [...context.api.endpoints.keys()].join(', ');
  response.headers.setIfMissing('', context.endpoint.definition.cors.accessControlAllowMethods ?? allowMethods);

  if (isDefined(context.endpoint.definition.cors.accessControlAllowCredentials)) {
    response.headers.setIfMissing('', context.endpoint.definition.cors.accessControlAllowCredentials);
  }

  if (isDefined(context.endpoint.definition.cors.accessControlAllowHeaders)) {
    response.headers.setIfMissing('', context.endpoint.definition.cors.accessControlAllowHeaders);
  }

  if (isDefined(context.endpoint.definition.cors.accessControlAllowOrigin)) {
    response.headers.setIfMissing('', context.endpoint.definition.cors.accessControlAllowOrigin);
  }

  if (isDefined(context.endpoint.definition.cors.accessControlExposeHeaders)) {
    response.headers.setIfMissing('', context.endpoint.definition.cors.accessControlExposeHeaders);
  }

  if (isDefined(context.endpoint.definition.cors.accessControlMaxAge)) {
    response.headers.setIfMissing('', context.endpoint.definition.cors.accessControlMaxAge);
  }

  return response;
}
