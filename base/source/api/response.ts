import { SecretRequirementsError } from '#/authentication/errors/secret-requirements.error.js';
import { SchemaError } from '#/schema/schema.error.js';
import { ApiError, BadRequestError, type CustomError, type CustomErrorStatic, ForbiddenError, InvalidCredentialsError, InvalidTokenError, MaxBytesExceededError, MethodNotAllowedError, NotFoundError, NotImplementedError, NotSupportedError, UnauthorizedError, UnsupportedMediaTypeError } from '../errors/index.js';
import type { UndefinableJson } from '#/types/index.js';
import { assertString, isDefined, isFunction, isObject, isString } from '../utils/type-guards.js';
import { deserializeSchemaError, serializeSchemaError } from './default-error-handlers.js';

export type ErrorHandlerData = undefined | UndefinableJson;

export type ErrorSerializer<T extends CustomError, TData extends ErrorHandlerData> = (error: T) => TData;
export type ErrorDeserializer<T extends CustomError, TData extends ErrorHandlerData> = (data: TData, responseError: ResponseError) => T;
export type ErrorHandler<T extends CustomError = CustomError, TData extends ErrorHandlerData = undefined> = {
  statusCode: number,
  serializer: ErrorSerializer<T, TData>,
  deserializer: ErrorDeserializer<T, TData>,
};

export type ResultResponse<T> = {
  result: T,
};

export type ErrorResponse = {
  error: ResponseError,
};

export type Response<T> = ResultResponse<T> | ErrorResponse;

export type ResponseError = {
  name: string,
  message: string,
  details?: any,
  data?: ErrorHandlerData,
};

const errorHandlers = new Map<string, ErrorHandler<any, any>>();

export function registerErrorHandler<T extends CustomError, TData extends ErrorHandlerData>(constructor: CustomErrorStatic<T>, statusCode: number, serializer: ErrorSerializer<T, TData>, deserializer: ErrorDeserializer<T, TData>): void {
  assertString(constructor.errorName, 'static property \'errorName\' missing.');

  if (errorHandlers.has(constructor.errorName)) {
    throw new Error(`A handler for ${constructor.errorName} already registered.`);
  }

  errorHandlers.set(constructor.errorName, { statusCode, serializer, deserializer });
}

export function hasErrorHandler(typeOrResponseOrName: CustomErrorStatic | ErrorResponse | string): boolean {
  const name = isFunction(typeOrResponseOrName)
    ? typeOrResponseOrName.errorName
    : isString(typeOrResponseOrName)
      ? typeOrResponseOrName
      : isErrorResponse(typeOrResponseOrName)
        ? typeOrResponseOrName.error.name
        : undefined;

  return errorHandlers.has(name!);
}

export function getErrorStatusCode(error: CustomError, defaultStatusCode: number = 500): number {
  return errorHandlers.get(error.name)?.statusCode ?? defaultStatusCode;
}

export function createErrorResponse(error: Error, details?: any): ErrorResponse;
export function createErrorResponse(name: string, message: string, details?: any): ErrorResponse;
export function createErrorResponse(errorOrName: Error | string, message: string = '', details?: any): ErrorResponse {
  let response: ErrorResponse;

  if (errorOrName instanceof Error) {
    const handler = errorHandlers.get(errorOrName.name);

    if (isDefined(handler)) {
      const data = handler.serializer(errorOrName) as ErrorHandlerData;

      response = {
        error: {
          name: errorOrName.name,
          message: errorOrName.message,
          details,
          data,
        },
      };
    }
    else {
      response = {
        error: {
          name: errorOrName.name,
          message: errorOrName.message,
          details,
        },
      };
    }
  }
  else {
    response = {
      error: {
        name: errorOrName,
        message,
        details,
      },
    };
  }

  return response;
}

export function parseErrorResponse(response: ErrorResponse, fallbackToGenericApiError?: true): Error;
export function parseErrorResponse(response: ErrorResponse, fallbackToGenericApiError: false): Error | undefined;
export function parseErrorResponse(response: ErrorResponse, fallbackToGenericApiError: boolean = true): Error | undefined {
  const handler = errorHandlers.get(response.error.name);

  if (handler != undefined) {
    const error = handler.deserializer(response.error.data, response.error) as Error;
    return error;
  }

  if (!fallbackToGenericApiError) {
    return undefined;
  }

  return new ApiError(response);
}

export function isErrorResponse(response: Response<any> | unknown): response is ErrorResponse {
  return isObject(response) && isDefined((response as ErrorResponse).error);
}

registerErrorHandler(ApiError, 400, ({ response }) => response, (response) => new ApiError(response));
registerErrorHandler(BadRequestError, 400, () => undefined, (_, error) => new BadRequestError(error.message));
registerErrorHandler(ForbiddenError, 403, () => undefined, (_, error) => new ForbiddenError(error.message));
registerErrorHandler(InvalidCredentialsError, 401, () => undefined, (_, error) => new InvalidCredentialsError(error.message));
registerErrorHandler(InvalidTokenError, 401, () => undefined, (_, error) => new InvalidTokenError(error.message));
registerErrorHandler(MaxBytesExceededError, 400, () => undefined, (_, error) => new MaxBytesExceededError(error.message));
registerErrorHandler(MethodNotAllowedError, 405, () => undefined, (_, error) => new MethodNotAllowedError(error.message));
registerErrorHandler(NotFoundError, 404, () => undefined, (_, error) => new NotFoundError(error.message));
registerErrorHandler(NotImplementedError, 501, () => undefined, (_, error) => new NotImplementedError(error.message));
registerErrorHandler(NotSupportedError, 400, () => undefined, (_, error) => new NotSupportedError(error.message));
registerErrorHandler(SchemaError, 400, serializeSchemaError, (data, error) => deserializeSchemaError(error.message, data));
registerErrorHandler(SecretRequirementsError, 403, () => undefined, (_, error) => new SecretRequirementsError(error.message));
registerErrorHandler(UnauthorizedError, 401, () => undefined, (_, error) => new UnauthorizedError(error.message));
registerErrorHandler(UnsupportedMediaTypeError, 415, () => undefined, (_, error) => new UnsupportedMediaTypeError(error.message));
