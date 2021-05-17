import type { CustomErrorStatic } from '../error';
import type { Type, UndefinableJson } from '../types';
import { isDefined } from '../utils';
import { ApiError } from '../error/api';

type ErrorHandlerData = undefined | UndefinableJson;

export type ErrorSerializer<T extends Error, TData extends ErrorHandlerData> = (error: T) => TData;
export type ErrorDeserializer<T extends Error, TData extends ErrorHandlerData> = (data: TData, responseError: ResponseError) => T;
export type ErrorHandler<T extends Error = Error, TData extends ErrorHandlerData = undefined> = {
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
  errorData?: ErrorHandlerData
};

const errorHandlers: Map<string, ErrorHandler<any, any>> = new Map();

export function registerErrorHandler<T extends Error, TData extends ErrorHandlerData>(constructor: Type<T> & CustomErrorStatic, statusCode: number, serializer: ErrorSerializer<T, TData>, deserializer: ErrorDeserializer<T, TData>): void {
  errorHandlers.set(constructor.errorName, { statusCode, serializer, deserializer });
}

export function hasErrorHandler(constructor: Type<Error> & CustomErrorStatic): boolean {
  return errorHandlers.has(constructor.errorName);
}

export function getErrorStatusCode(error: Error, defaultStatusCode: number = 500): number {
  const handler = errorHandlers.get(error.name);
  return (handler != undefined) ? handler.statusCode : defaultStatusCode;
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
      const errorData = handler.serializer(errorOrName) as ErrorHandlerData;

      response = {
        error: {
          name: errorOrName.name,
          message: errorOrName.message,
          details,
          errorData
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

  throw new Error('unsupported response');
}

export function parseErrorResponse(response: ErrorResponse): Error {
  const handler = errorHandlers.get(response.error.name);

  if (handler != undefined) {
    const error = handler.deserializer(response.error.errorData, response.error) as Error;
    return error;
  }

  return new ApiError(response);
}

export function isResultResponse<T = any>(response: Response<T> | unknown): response is ResultResponse<T> {
  const hasResult = isDefined((response as ResultResponse<T>).result);
  return hasResult;
}

export function isErrorResponse(response: Response<any> | unknown): response is ErrorResponse {
  const hasError = isDefined((response as ErrorResponse).error);
  return hasError;
}

export function isResponse<T = any>(obj: unknown): obj is Response<T> {
  return (isResultResponse(obj) || isErrorResponse(obj));
}
