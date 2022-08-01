import { MethodNotAllowedError } from '#/error/method-not-allowed.error';
import type { HttpServerRequest } from '#/http/server';
import { HttpServerResponse } from '#/http/server';
import type { AsyncMiddlewareNext } from '#/utils/middleware';
import { isUndefined } from '#/utils/type-guards';
import type { ApiGatewayMiddlewareContext } from '../gateway';

export async function allowedMethodsMiddleware(request: HttpServerRequest, next: AsyncMiddlewareNext<HttpServerRequest, HttpServerResponse>, context: ApiGatewayMiddlewareContext): Promise<HttpServerResponse> {
  if (request.method != 'OPTIONS') {
    if (isUndefined(context.endpoint)) {
      throw new MethodNotAllowedError(`method ${request.method} for resource ${context.api.resource} not available`);
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
