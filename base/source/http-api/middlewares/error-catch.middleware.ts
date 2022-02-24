import { createErrorResponse, getErrorStatusCode, hasErrorHandler } from '#/api/response';
import type { CustomError, CustomErrorStatic } from '#/error';
import type { HttpServerRequest } from '#/http/server';
import { HttpServerResponse } from '#/http/server';
import type { Logger } from '#/logger';
import type { Type } from '#/types';
import { formatError } from '#/utils/helpers';
import type { AsyncMiddlerwareHandler, AsyncMiddleware } from '#/utils/middleware';

export function errorCatchMiddleware(logger: Logger, supressedErrors: Set<Type<Error>>): AsyncMiddleware<HttpServerRequest, HttpServerResponse> {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  async function errorCatchMiddleware(request: HttpServerRequest, next: AsyncMiddlerwareHandler<HttpServerRequest, HttpServerResponse>): Promise<HttpServerResponse> {
    try {
      const response = await next(request);
      return response;
    }
    catch (error: unknown) {
      const response = new HttpServerResponse();

      if (error instanceof Error) {
        const errorConstructor = error.constructor as Type<Error> & CustomErrorStatic;
        const supressed = supressedErrors.has(errorConstructor);

        if (!supressed) {
          logger.error(error);
        }

        if (hasErrorHandler(errorConstructor)) {
          response.statusCode = getErrorStatusCode(error as CustomError);
          response.body = { json: createErrorResponse(error) };
        }
        else {
          response.statusCode = 500;
          response.body = { json: createErrorResponse('500', 'Internal Server Error') };
        }
      }
      else {
        const formattedError = formatError(error, { includeStack: true, includeRest: true, handleBuiltInErrors: true });
        logger.error(formattedError);

        response.statusCode = 500;
        response.body = { json: createErrorResponse('500', 'Internal Server Error') };
      }

      return response;
    }
  }

  return errorCatchMiddleware;
}
