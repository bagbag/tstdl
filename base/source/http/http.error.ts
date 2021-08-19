import { CustomError } from '../error';
import type { HttpRequest, HttpResponse } from './client';

export class HttpError extends CustomError {
  static readonly errorName = 'HttpError';

  readonly request: HttpRequest;
  readonly response?: HttpResponse<any>;

  constructor(request: HttpRequest, response?: HttpResponse<any>, cause?: Error) {
    super({ name: 'HttpError', message: cause?.message ?? 'An error occurred', cause });

    this.request = request;
    this.response = response;
  }
}
