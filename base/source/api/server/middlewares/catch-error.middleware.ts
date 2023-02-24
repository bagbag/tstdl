import type { HttpServerRequest, HttpServerResponse } from '#/http/server/index.js';
import type { Logger } from '#/logger/index.js';
import type { Type } from '#/types.js';
import type { AsyncMiddlewareNext } from '#/utils/middleware.js';
import { handleApiError } from '../error-handler.js';
import type { ApiGatewayMiddleware } from '../gateway.js';

export function catchErrorMiddleware(supressedErrors: Set<Type<Error>>, logger: Logger): ApiGatewayMiddleware {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  async function catchErrorMiddleware(request: HttpServerRequest, next: AsyncMiddlewareNext<HttpServerRequest, HttpServerResponse>): Promise<HttpServerResponse> {
    try {
      const response = await next(request);
      return response;
    }
    catch (error) {
      return handleApiError(error, supressedErrors, logger);
    }
  }

  return catchErrorMiddleware;
}
