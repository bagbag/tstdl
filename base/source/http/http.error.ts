import type { Record, TypedOmit, UndefinableJson } from '#/types';
import { isAsyncIterable } from '#/utils/async-iterable-helpers';
import type { ErrorExtraInfo } from '#/utils/format-error';
import { propertyNameOf } from '#/utils/object/property-name';
import { isDefined, isNotString, isString } from '#/utils/type-guards';
import { CustomError } from '../error';
import type { HttpClientRequest, HttpClientRequestObject, HttpClientResponse, HttpClientResponseObject } from './client';

export enum HttpErrorReason {
  Unknown = 'Unknown',
  Cancelled = 'Cancelled',
  InvalidRequest = 'InvalidRequest',
  Non200StatusCode = 'Non200StatusCode',
  ErrorResponse = 'ErrorResponse',
  Timeout = 'Timeout'
}

export class HttpError extends CustomError implements ErrorExtraInfo {
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
      Reflect.deleteProperty(this.response, 'request');
    }

    Object.defineProperty(this, propertyNameOf<this>((instance) => instance.requestInstance), {
      value: request,
      enumerable: false
    });

    Object.defineProperty(this, propertyNameOf<this>((instance) => instance.responseInstance), {
      value: response,
      enumerable: false
    });
  }

  getExtraInfo(): UndefinableJson | undefined {
    const extraInfo: Record<string> = {
      url: this.request.url,
      method: this.request.method
    };

    if (isDefined(this.response)) {
      const responseExtraInfo: Record<string> = {};

      responseExtraInfo['statusCode'] = this.response.statusCode;
      responseExtraInfo['statusMessage'] = this.response.statusMessage;
      responseExtraInfo['headers'] = this.response.headers;

      if (this.response.body instanceof Uint8Array) {
        responseExtraInfo['body'] = '[Uint8Array]';
      }

      if (isAsyncIterable(this.response.body)) {
        responseExtraInfo['body'] = '[AsyncIterable]';
      }

      if (isDefined(this.response.body)) {
        responseExtraInfo['body'] = this.response.body;
      }

      extraInfo['response'] = responseExtraInfo;
    }

    return extraInfo;
  }
}
