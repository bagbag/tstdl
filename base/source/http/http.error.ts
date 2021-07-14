import { CustomError } from '../error';
import type { HttpMethod, HttpRequestOptions, HttpResponse } from './client';

export class HttpError extends CustomError {
  readonly url: string;
  readonly method: HttpMethod;
  readonly options: HttpRequestOptions;
  readonly response?: HttpResponse<any>;

  constructor(url: string, method: HttpMethod, options: HttpRequestOptions, response?: HttpResponse<any>) {
    super({ name: 'HttpError', message: response?.statusMessage ?? 'HttpError' });

    this.url = url;
    this.method = method;
    this.options = options;
    this.response = response;
  }
}
