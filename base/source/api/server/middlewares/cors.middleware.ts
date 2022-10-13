import type { ApiEndpointDefinitionCors, ApiEndpointMethod } from '#/api/types';
import { resolveApiEndpointDataProvider } from '#/api/types';
import type { HttpServerRequest, HttpServerResponse } from '#/http/server';
import type { AsyncMiddlewareNext } from '#/utils/middleware';
import { isDefined } from '#/utils/type-guards';
import type { ApiGatewayMiddleware, ApiGatewayMiddlewareContext } from '../gateway';

export type CorsMiddlewareOptions = {
  default?: ApiEndpointDefinitionCors
};

export function corsMiddleware(options: CorsMiddlewareOptions = {}): ApiGatewayMiddleware {
  // eslint-disable-next-line max-statements, @typescript-eslint/no-shadow
  async function corsMiddleware(request: HttpServerRequest, next: AsyncMiddlewareNext<HttpServerRequest, HttpServerResponse>, context: ApiGatewayMiddlewareContext): Promise<HttpServerResponse> {
    const response = await next(request);

    const requestMethod = request.headers.tryGetSingle('Access-Control-Request-Method') ?? request.method;
    const cors = { ...options.default, ...context.api.endpoints.get(requestMethod as ApiEndpointMethod)?.definition.cors };

    if (request.method == 'OPTIONS') {
      const allowMethods = (await resolveApiEndpointDataProvider(request, context, cors.accessControlAllowMethods)) ?? [...context.api.endpoints.keys()].join(', ');
      const allowCredentials = isDefined(cors.accessControlAllowCredentials) && (await resolveApiEndpointDataProvider(request, context, cors.accessControlAllowCredentials));

      response.headers.setIfMissing('Access-Control-Allow-Methods', allowMethods);

      if (allowCredentials) {
        response.headers.setIfMissing('Access-Control-Allow-Credentials', 'true');
      }

      if (isDefined(cors.accessControlAllowHeaders)) {
        const value = await resolveApiEndpointDataProvider(request, context, cors.accessControlAllowHeaders);
        response.headers.setIfMissing('Access-Control-Allow-Headers', value);
      }

      if (isDefined(cors.accessControlExposeHeaders)) {
        const value = await resolveApiEndpointDataProvider(request, context, cors.accessControlExposeHeaders);
        response.headers.setIfMissing('Access-Control-Expose-Headers', value);
      }

      if (isDefined(cors.accessControlMaxAge)) {
        const value = await resolveApiEndpointDataProvider(request, context, cors.accessControlMaxAge);
        response.headers.setIfMissing('Access-Control-Max-Age', value);
      }
    }

    if (isDefined(cors.accessControlAllowOrigin)) {
      const value = await resolveApiEndpointDataProvider(request, context, cors.accessControlAllowOrigin);
      response.headers.setIfMissing('Access-Control-Allow-Origin', value);
    }

    return response;
  }

  return corsMiddleware;
}
