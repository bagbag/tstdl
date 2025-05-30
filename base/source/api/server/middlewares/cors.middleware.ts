import type { ApiEndpointDefinitionCors, ApiEndpointMethod } from '#/api/types.js';
import { resolveApiEndpointDataProvider } from '#/api/types.js';
import { toArray } from '#/utils/array/array.js';
import { isDefined } from '#/utils/type-guards.js';
import type { ApiGatewayMiddleware, ApiGatewayMiddlewareContext, ApiGatewayMiddlewareNext } from '../gateway.js';

export type CorsMiddlewareOptions = {
  default?: ApiEndpointDefinitionCors
};

export function corsMiddleware(options: CorsMiddlewareOptions = {}): ApiGatewayMiddleware {
  async function corsMiddleware(context: ApiGatewayMiddlewareContext, next: ApiGatewayMiddlewareNext): Promise<void> {
    try {
      await next();
    }
    finally {
      const { request, response } = context;

      const requestMethod = request.headers.tryGetSingle('Access-Control-Request-Method') ?? request.method;
      const isOptions = (request.method == 'OPTIONS');
      const endpointDefinition = context.api.endpoints.get(requestMethod as ApiEndpointMethod)?.definition;
      const cors = { ...options.default, ...endpointDefinition?.cors };

      if (isOptions) {
        const allowMethods = (await resolveApiEndpointDataProvider(request, context, cors.accessControlAllowMethods)) ?? [...context.api.endpoints.keys()].join(', ');

        response.headers.set('Access-Control-Allow-Methods', allowMethods);

        if (isDefined(cors.accessControlAllowHeaders) && !request.headers.has('Access-Control-Allow-Headers')) {
          const value = await resolveApiEndpointDataProvider(request, context, cors.accessControlAllowHeaders);
          response.headers.set('Access-Control-Allow-Headers', value);
        }

        if (isDefined(cors.accessControlExposeHeaders) && !request.headers.has('Access-Control-Expose-Headers')) {
          const value = await resolveApiEndpointDataProvider(request, context, cors.accessControlExposeHeaders);
          response.headers.set('Access-Control-Expose-Headers', value);
        }

        if (isDefined(cors.accessControlMaxAge) && !request.headers.has('Access-Control-Max-Age')) {
          const value = await resolveApiEndpointDataProvider(request, context, cors.accessControlMaxAge);
          response.headers.set('Access-Control-Max-Age', value);
        }
      }

      if (!request.headers.has('Access-Control-Allow-Credentials')) {
        const allowCredentials = isDefined(cors.accessControlAllowCredentials)
          ? await resolveApiEndpointDataProvider(request, context, cors.accessControlAllowCredentials)
          : endpointDefinition?.credentials;

        if (allowCredentials == true) {
          response.headers.set('Access-Control-Allow-Credentials', 'true');
        }
      }

      if (isDefined(cors.accessControlAllowOrigin) && !response.headers.has('Access-Control-Allow-Origin')) {
        const value = await resolveApiEndpointDataProvider(request, context, cors.accessControlAllowOrigin);
        response.headers.set('Access-Control-Allow-Origin', value);
      }

      if (isDefined(cors.autoAccessControlAllowOrigin) && !response.headers.has('Access-Control-Allow-Origin')) {
        const value = await resolveApiEndpointDataProvider(request, context, cors.autoAccessControlAllowOrigin);
        const origin = request.headers.tryGetSingle('Origin') as string;
        const allowed = isDefined(value) && toArray(value).includes(origin);

        if (allowed) {
          response.headers.set('Access-Control-Allow-Origin', origin);
        }
      }
    }
  }

  return corsMiddleware;
}
