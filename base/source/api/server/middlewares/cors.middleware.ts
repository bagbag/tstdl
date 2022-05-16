import type { ApiEndpointMethod } from '#/api/types';
import type { HttpServerRequest, HttpServerResponse } from '#/http/server';
import type { AsyncMiddlewareNext } from '#/utils/middleware';
import { isDefined, isUndefined } from '#/utils/type-guards';
import type { ApiGatewayMiddlewareContext } from '../gateway';

// eslint-disable-next-line max-statements
export async function corsMiddleware(request: HttpServerRequest, next: AsyncMiddlewareNext<HttpServerRequest, HttpServerResponse>, context: ApiGatewayMiddlewareContext): Promise<HttpServerResponse> {
  const response = await next(request);

  const requestMethod = request.headers.tryGetSingle('Access-Control-Request-Method');
  const cors = context.api.endpoints.get(requestMethod as ApiEndpointMethod)?.definition.cors;

  if (isUndefined(cors)) {
    return response;
  }

  if (request.method == 'OPTIONS') {
    const allowMethods = [...context.api.endpoints.keys()].join(', ');
    response.headers.setIfMissing('Access-Control-Allow-Methods', cors.accessControlAllowMethods ?? allowMethods);

    if (cors.accessControlAllowCredentials == true) {
      response.headers.setIfMissing('Access-Control-Allow-Credentials', 'true');
    }

    if (isDefined(cors.accessControlAllowHeaders)) {
      response.headers.setIfMissing('Access-Control-Allow-Headers', cors.accessControlAllowHeaders);
    }

    if (isDefined(cors.accessControlExposeHeaders)) {
      response.headers.setIfMissing('Access-Control-Expose-Headers', cors.accessControlExposeHeaders);
    }

    if (isDefined(cors.accessControlMaxAge)) {
      response.headers.setIfMissing('Access-Control-Max-Age', cors.accessControlMaxAge);
    }
  }

  if (isDefined(cors.accessControlAllowOrigin)) {
    response.headers.setIfMissing('Access-Control-Allow-Origin', cors.accessControlAllowOrigin);
  }

  return response;
}
