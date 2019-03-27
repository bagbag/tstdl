import { CustomError } from '../utils/custom-error';
import { ErrorResponse } from './response';

export class ApiError extends CustomError {
  readonly details: any;

  constructor(response: ErrorResponse) {
    super(response.error.message);

    this.details = response.error.details;
  }
}
