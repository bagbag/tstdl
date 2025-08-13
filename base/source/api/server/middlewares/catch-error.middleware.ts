import type { Logger } from '#/logger/index.js';
import type { Type } from '#/types/index.js';
import { handleApiError } from '../error-handler.js';
import type { ApiGatewayMiddleware, ApiGatewayMiddlewareContext, ApiGatewayMiddlewareNext } from '../gateway.js';

export function getCatchErrorMiddleware(supressedErrors: Set<Type<Error>>, logger: Logger): ApiGatewayMiddleware {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  async function catchErrorMiddleware(context: ApiGatewayMiddlewareContext, next: ApiGatewayMiddlewareNext): Promise<void> {
    try {
      await next();
    }
    catch (error) {
      handleApiError(error, context.response, supressedErrors, logger);
    }
  }

  return catchErrorMiddleware;
}
