import { isDefined } from '#/utils/type-guards';
import { CustomError } from '../error';
import type { HttpClientRequest, HttpClientResponse } from './types';

export enum HttpErrorReason {
  Unknown = 'Unknown',
  Cancelled = 'Cancelled',
  InvalidRequest = 'InvalidRequest',
  Timeout = 'Timeout'
}

export class HttpError extends CustomError {
  static readonly errorName = 'HttpError';

  readonly reason: HttpErrorReason;
  readonly request: HttpClientRequest;
  readonly response?: HttpClientResponse;

  constructor(reason: HttpErrorReason, request: HttpClientRequest, response?: HttpClientResponse, cause?: Error) {
    super({ message: cause?.message ?? 'An error occurred', cause });

    this.reason = reason;
    this.request = request;

    if (isDefined(response)) {
      this.response = response;
    }
  }
}
