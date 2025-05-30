import type { Record, TypedOmit, UndefinableJson } from '#/types.js';
import type { ErrorExtraInfo } from '#/utils/format-error.js';
import { propertyNameOf } from '#/utils/object/property-name.js';
import { isDefined, isNotString, isString } from '#/utils/type-guards.js';
import { CustomError } from '../errors/custom.error.js';
import type { HttpClientRequest, HttpClientRequestObject, HttpClientResponse, HttpClientResponseObject } from './client/index.js';

export enum HttpErrorReason {
  Unknown = 'Unknown',
  Cancelled = 'Cancelled',
  Network = 'Network',
  InvalidRequest = 'InvalidRequest',
  StatusCode = 'StatusCode',

  /** Valid http response containing an error */
  ErrorResponse = 'ErrorResponse',

  /** Invalid http response */
  ResponseError = 'ResponseError',

  Timeout = 'Timeout',
}

export class HttpError extends CustomError implements ErrorExtraInfo {
  static readonly errorName = 'HttpError';

  readonly reason: HttpErrorReason;
  readonly request: HttpClientRequestObject;
  readonly response: TypedOmit<HttpClientResponseObject, 'request'> | undefined;
  readonly responseBody: UndefinableJson | Uint8Array;
  readonly requestInstance: HttpClientRequest;
  readonly responseInstance: HttpClientResponse | undefined;

  constructor(reason: HttpErrorReason, request: HttpClientRequest, { response, responseBody, cause }: { response?: HttpClientResponse, responseBody?: UndefinableJson | Uint8Array, cause?: Error | string } = {}) {
    super({ message: (isString(cause) ? cause : cause?.message) ?? 'An error occurred', cause: (isNotString(cause) ? cause : new Error(cause)) });

    this.reason = reason;
    this.request = request.asObject();
    this.response = response?.asObject();

    if (isDefined(this.response)) {
      Reflect.deleteProperty(this.response, 'request');
    }

    if (isDefined(responseBody)) {
      this.responseBody = responseBody;
    }

    Object.defineProperty(this, propertyNameOf<this>((instance) => instance.requestInstance), {
      value: request,
      enumerable: false,
    });

    Object.defineProperty(this, propertyNameOf<this>((instance) => instance.responseInstance), {
      value: response,
      enumerable: false,
    });
  }

  static async create(reason: HttpErrorReason, request: HttpClientRequest, response: HttpClientResponse | undefined, cause?: Error | string): Promise<HttpError> {
    const body = (response?.body.available == true) ? await response.body.read() : undefined;
    return new HttpError(reason, request, { response, responseBody: body, cause });
  }

  getExtraInfo(): UndefinableJson | undefined {
    const extraInfo: Record<string> = {
      url: this.request.url,
      method: this.request.method,
    };

    if (isDefined(this.response)) {
      const responseExtraInfo: Record<string> = {};

      responseExtraInfo['statusCode'] = this.response.statusCode;
      responseExtraInfo['statusMessage'] = this.response.statusMessage;
      responseExtraInfo['headers'] = this.response.headers;

      if (isDefined(this.responseBody)) {
        responseExtraInfo['body'] = (this.responseBody instanceof Uint8Array)
          ? '[Uint8Array]'
          : this.responseBody;
      }

      extraInfo['response'] = responseExtraInfo;
    }

    return extraInfo;
  }
}
