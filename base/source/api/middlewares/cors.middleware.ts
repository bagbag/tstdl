import type { HttpServerRequest, HttpServerResponse } from '#/http/server';
import type { AsyncMiddlewareNext } from '#/utils/middleware';
import { isDefined } from '#/utils/type-guards';
import type { ApiGatewayMiddlewareContext } from '../gateway';

// eslint-disable-next-line max-statements
export async function corsMiddleware(request: HttpServerRequest, next: AsyncMiddlewareNext<HttpServerRequest, HttpServerResponse>, context: ApiGatewayMiddlewareContext): Promise<HttpServerResponse> {
  const response = await next(request);

  if (request.method != 'OPTIONS') {
    return response;
  }

  const resourceEndpoints = [...context.api.endpoints.values()];
  const corses = resourceEndpoints.map((endpoint) => endpoint.definition.cors).filter(isDefined);

  if (corses.length == 0) {
    return response;
  }

  if (corses.length > 1) {
    throw new Error('cors can only be defined once per resource');
  }

  const cors = corses[0]!;

  const allowMethods = [...context.api.endpoints.keys()].join(', ');
  response.headers.setIfMissing('Access-Control-Allow-Methods', cors.accessControlAllowMethods ?? allowMethods);

  if (cors.accessControlAllowCredentials == true) {
    response.headers.setIfMissing('Access-Control-Allow-Credentials', 'true');
  }

  if (isDefined(cors.accessControlAllowHeaders)) {
    response.headers.setIfMissing('Access-Control-Allow-Headers', cors.accessControlAllowHeaders);
  }

  if (isDefined(cors.accessControlAllowOrigin)) {
    response.headers.setIfMissing('Access-Control-Allow-Origin', cors.accessControlAllowOrigin);
  }

  if (isDefined(cors.accessControlExposeHeaders)) {
    response.headers.setIfMissing('Access-Control-Expose-Headers', cors.accessControlExposeHeaders);
  }

  if (isDefined(cors.accessControlMaxAge)) {
    response.headers.setIfMissing('Access-Control-Max-Age', cors.accessControlMaxAge);
  }

  return response;
}
