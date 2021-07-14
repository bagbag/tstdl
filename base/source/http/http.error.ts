import { CustomError } from '../error';
import type { HttpMethod, HttpRequestOptions, HttpResponse } from './client';

export class HttpError extends CustomError {
  static readonly errorName = 'HttpError';

  readonly url: string;
  readonly method: HttpMethod;
  readonly options: HttpRequestOptions;
  readonly response?: HttpResponse<any>;
  readonly error: Error;

  constructor(url: string, method: HttpMethod, options: HttpRequestOptions = {}, response?: HttpResponse<any>, error: Error | undefined = { name: 'Error not provided', message: response?.statusMessage ?? 'An error occurred' }) {
    super({ name: 'HttpError', message: error.message });

    this.url = url;
    this.method = method;
    this.options = options;
    this.response = response;
    this.error = error;
  }
}
