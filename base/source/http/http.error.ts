import type { TypedOmit } from '#/types';
import { isDefined, isNotString, isString } from '#/utils/type-guards';
import { CustomError } from '../error';
import type { HttpClientRequest, HttpClientRequestObject, HttpClientResponse, HttpClientResponseObject } from './client';

export enum HttpErrorReason {
  Unknown = 'Unknown',
  Cancelled = 'Cancelled',
  InvalidRequest = 'InvalidRequest',
  ErrorResponse = 'ErrorResponse',
  Timeout = 'Timeout'
}

export class HttpError extends CustomError {
  static readonly errorName = 'HttpError';

  readonly reason: HttpErrorReason;
  readonly request: HttpClientRequestObject;
  readonly response: TypedOmit<HttpClientResponseObject, 'request'> | undefined;
  readonly requestInstance: HttpClientRequest;
  readonly responseInstance: HttpClientResponse | undefined;

  constructor(reason: HttpErrorReason, request: HttpClientRequest, response?: HttpClientResponse, cause?: Error | string) {
    super({ message: (isString(cause) ? cause : cause?.message) ?? 'An error occurred', cause: (isNotString(cause) ? cause : undefined) });

    this.reason = reason;
    this.request = request.asObject();
    this.response = response?.asObject();

    if (isDefined(this.response)) {
      delete (this.response as any).request;
    }

    Object.defineProperty(this, 'requestInstance', {
      value: request,
      enumerable: false
    });

    Object.defineProperty(this, 'responseInstance', {
      value: response,
      enumerable: false
    });
  }
}
