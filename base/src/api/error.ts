import { CustomError } from '../error/custom-error';
import { ErrorResponse } from './response';

export class ApiError extends CustomError {
  readonly details: any;

  constructor(response: ErrorResponse) {
    super({ message: response.error.message, name: response.error.name });

    this.details = response.error.details;
  }
}
