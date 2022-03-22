import type { HttpServerRequest, HttpServerResponse } from '#/http/server';
import type { Logger } from '#/logger';
import type { Type } from '#/types';
import type { AsyncMiddlewareNext } from '#/utils/middleware';
import { handleApiError } from '../error-handler';
import type { ApiGatewayMiddleware } from '../gateway';

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
