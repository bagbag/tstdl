import type { CustomError, CustomErrorStatic } from '#/errors/custom.error.js';
import type { HttpServerResponse } from '#/http/server/index.js';
import type { Logger } from '#/logger/index.js';
import type { Type } from '#/types.js';
import { formatError } from '#/utils/format-error.js';
import { createErrorResponse, getErrorStatusCode, hasErrorHandler } from '../response.js';

export function handleApiError(error: unknown, response: HttpServerResponse, supressedErrors: Set<Type<Error>>, logger: Logger): HttpServerResponse {
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
    const formattedError = formatError(error, { includeStack: true, includeRest: 'if-no-extra-info', includeExtraInfo: true });
    logger.error(formattedError);

    response.statusCode = 500;
    response.body = { json: createErrorResponse('500', 'Internal Server Error') };
  }

  return response;
}
