import type { CustomError, CustomErrorStatic } from '#/error/custom.error';
import { HttpServerResponse } from '#/http/server';
import type { Logger } from '#/logger';
import type { Type } from '#/types';
import { formatError } from '#/utils/format-error';
import { createErrorResponse, getErrorStatusCode, hasErrorHandler } from '../response';

export function handleApiError(error: unknown, supressedErrors: Set<Type<Error>>, logger: Logger): HttpServerResponse {
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
    const formattedError = formatError(error, { includeStack: true, includeRest: 'if-no-extra-info', includeExtraInfo: true });
    logger.error(formattedError);

    response.statusCode = 500;
    response.body = { json: createErrorResponse('500', 'Internal Server Error') };
  }

  return response;
}
