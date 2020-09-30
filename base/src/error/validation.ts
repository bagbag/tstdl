import { CustomError } from './custom-error';

export class ValidationError extends CustomError {
  readonly details: any;

  constructor(message: string, details?: any) {
    super({ name: ValidationError.name, message });

    this.details = details;
  }
}
