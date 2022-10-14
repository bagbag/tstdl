import { SchemaError } from '#/schema/schema.error';
import type { CustomError, CustomErrorStatic } from '../error';
import { ApiError, BadRequestError, ForbiddenError, InvalidTokenError, MaxBytesExceededError, MethodNotAllowedError, NotFoundError, NotImplementedError, NotSupportedError, UnauthorizedError, UnsupportedMediaTypeError, ValidationError } from '../error';
import type { UndefinableJson } from '../types';
import { isDefined, isFunction, isObject, isString } from '../utils/type-guards';
import { deserializeSchemaError, deserializeValidationError, serializeSchemaError, serializeValidationError } from './default-error-handlers';

export type ErrorHandlerData = undefined | UndefinableJson;

export type ErrorSerializer<T extends CustomError, TData extends ErrorHandlerData> = (error: T) => TData;
export type ErrorDeserializer<T extends CustomError, TData extends ErrorHandlerData> = (data: TData, responseError: ResponseError) => T;
export type ErrorHandler<T extends CustomError = CustomError, TData extends ErrorHandlerData = undefined> = {
  statusCode: number,
  serializer: ErrorSerializer<T, TData>,
  deserializer: ErrorDeserializer<T, TData>
};

export type ResultResponse<T> = {
  result: T
};

export type ErrorResponse = {
  error: ResponseError
};

export type Response<T> = ResultResponse<T> | ErrorResponse;

export type ResponseError = {
  name: string,
  message: string,
  details?: any,
  data?: ErrorHandlerData
};

const errorHandlers = new Map<string, ErrorHandler<any, any>>();

export function registerErrorHandler<T extends CustomError, TData extends ErrorHandlerData>(constructor: CustomErrorStatic<T>, statusCode: number, serializer: ErrorSerializer<T, TData>, deserializer: ErrorDeserializer<T, TData>): void {
  if (errorHandlers.has(constructor.errorName)) {
    throw new Error(`A handler for ${constructor.errorName} already registered.`);
  }

  errorHandlers.set(constructor.errorName, { statusCode, serializer, deserializer });
}

export function hasErrorHandler(constructor: CustomErrorStatic | ErrorResponse | string): boolean {
  const name = isFunction(constructor)
    ? constructor.errorName
    : isString(constructor)
      ? constructor
      : isErrorResponse(constructor)
        ? constructor.error.name
        : undefined;

  return errorHandlers.has(name!);
}

export function getErrorStatusCode(error: CustomError, defaultStatusCode: number = 500): number {
  return errorHandlers.get(error.name)?.statusCode ?? defaultStatusCode;
}

export function createResultResponse<T>(result: T): ResultResponse<T> {
  const response: ResultResponse<T> = {
    result
  };

  return response;
}

export function createErrorResponse(error: Error, details?: any): ErrorResponse;
export function createErrorResponse(name: string, message: string, details?: any): ErrorResponse;
export function createErrorResponse(errorOrName: Error | string, message: string = '', details?: any): ErrorResponse {
  let response: ErrorResponse;

  if (errorOrName instanceof Error) {
    const handler = errorHandlers.get(errorOrName.name);

    if (handler != undefined) {
      const data = handler.serializer(errorOrName) as ErrorHandlerData;

      response = {
        error: {
          name: errorOrName.name,
          message: errorOrName.message,
          details,
          data
        }
      };
    }
    else {
      response = {
        error: {
          name: errorOrName.name,
          message: errorOrName.message,
          details
        }
      };
    }
  }
  else {
    response = {
      error: {
        name: errorOrName,
        message,
        details
      }
    };
  }

  return response;
}

export function parseResponse<T>(response: Response<T>): T {
  if (isResultResponse(response)) {
    return response.result;
  }

  if (isErrorResponse(response)) {
    throw parseErrorResponse(response);
  }

  throw new Error('Unsupported response.');
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

export function isResultResponse<T = any>(response: Response<T> | unknown): response is ResultResponse<T> {
  const hasResult = isObject(response) && isDefined((response as ResultResponse<T>).result);
  return hasResult;
}

export function isErrorResponse(response: Response<any> | unknown): response is ErrorResponse {
  const hasError = isObject(response) && isDefined((response as ErrorResponse).error);
  return hasError;
}

export function isResponse<T = any>(obj: unknown): obj is Response<T> {
  return (isResultResponse(obj) || isErrorResponse(obj));
}

registerErrorHandler(ApiError, 400, ({ response }) => response, (response) => new ApiError(response));
registerErrorHandler(BadRequestError, 400, () => undefined, (_, error) => new BadRequestError(error.message));
registerErrorHandler(ForbiddenError, 403, () => undefined, (_, error) => new ForbiddenError(error.message));
registerErrorHandler(InvalidTokenError, 401, () => undefined, (_, error) => new InvalidTokenError(error.message));
registerErrorHandler(MaxBytesExceededError, 400, () => undefined, (_, error) => new MaxBytesExceededError(error.message));
registerErrorHandler(NotFoundError, 404, () => undefined, (_, error) => new NotFoundError(error.message));
registerErrorHandler(NotImplementedError, 501, () => undefined, (_, error) => new NotImplementedError(error.message));
registerErrorHandler(NotSupportedError, 400, () => undefined, (_, error) => new NotSupportedError(error.message));
registerErrorHandler(UnauthorizedError, 401, () => undefined, (_, error) => new UnauthorizedError(error.message));
registerErrorHandler(MethodNotAllowedError, 405, () => undefined, (_, error) => new MethodNotAllowedError(error.message));
registerErrorHandler(UnsupportedMediaTypeError, 415, () => undefined, (_, error) => new UnsupportedMediaTypeError(error.message));
registerErrorHandler(ValidationError, 400, serializeValidationError, deserializeValidationError);
registerErrorHandler(SchemaError, 400, serializeSchemaError, deserializeSchemaError);
