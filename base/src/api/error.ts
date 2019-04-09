import { CustomError } from '../utils/custom-error';
import { ErrorResponse } from './response';

export class ApiError extends CustomError {
  readonly name: string;
  readonly details: any;

  constructor(response: ErrorResponse) {
    super(response.error.message);

    this.name = response.error.name;
    this.details = response.error.details;
  }
}
