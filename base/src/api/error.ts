import { CustomError } from '../error/custom-error';
import type { ErrorResponse } from './response';

export class ApiError extends CustomError {
  readonly details: any;

  constructor(response: ErrorResponse) {
    super({ name: 'ApiError', message: `${response.error.name} - ${response.error.message}` });

    this.details = response.error.details;
  }
}
