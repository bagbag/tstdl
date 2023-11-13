import { MethodNotAllowedError } from '#/errors/method-not-allowed.error.js';
import { isUndefined } from '#/utils/type-guards.js';
import type { ApiGatewayMiddlewareContext, ApiGatewayMiddlewareNext } from '../gateway.js';

export async function allowedMethodsMiddleware({ endpoint, api, request, response }: ApiGatewayMiddlewareContext, next: ApiGatewayMiddlewareNext): Promise<void> {
  if (request.method != 'OPTIONS') {
    if (isUndefined(endpoint)) {
      throw new MethodNotAllowedError(`Method ${request.method} for resource ${api.resource} not available.`);
    }

    return next();
  }

  const allowMethods = [...api.endpoints.keys()].join(', ');

  response.statusCode = 204;
  response.statusMessage = 'No Content';
  response.headers.setIfMissing('Allow', allowMethods);
}
