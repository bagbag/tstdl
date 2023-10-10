import { MethodNotAllowedError } from '#/errors/method-not-allowed.error.js';
import type { HttpServerRequest } from '#/http/server/index.js';
import { HttpServerResponse } from '#/http/server/index.js';
import type { AsyncMiddlewareNext } from '#/utils/middleware.js';
import { isUndefined } from '#/utils/type-guards.js';
import type { ApiGatewayMiddlewareContext } from '../gateway.js';

export async function allowedMethodsMiddleware(request: HttpServerRequest, next: AsyncMiddlewareNext<HttpServerRequest, HttpServerResponse>, context: ApiGatewayMiddlewareContext): Promise<HttpServerResponse> {
  if (request.method != 'OPTIONS') {
    if (isUndefined(context.endpoint)) {
      throw new MethodNotAllowedError(`Method ${request.method} for resource ${context.api.resource} not available.`);
    }

    return next(request);
  }

  const allowMethods = [...context.api.endpoints.keys()].join(', ');

  return HttpServerResponse.fromObject({
    statusCode: 204,
    statusMessage: 'No Content',
    headers: {
      Allow: allowMethods
    }
  });
}
