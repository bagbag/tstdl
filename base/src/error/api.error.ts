import { CustomError } from './custom.error';
import type { ErrorResponse } from '../api/response';

export class ApiError extends CustomError {
  static readonly errorName = 'ApiError';

  readonly details: any;
  readonly response: ErrorResponse;

  constructor(response: ErrorResponse) {
    super({ name: 'ApiError', message: `${response.error.name} - ${response.error.message}` });

    this.response = response;
    this.details = response.error.details;
  }
}
