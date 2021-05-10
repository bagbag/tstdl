import { CustomError } from './custom-error';

export class ValidationError extends CustomError {
  readonly details?: any;
  readonly inner?: ValidationError[];

  constructor(message: string, { details, inner }: { details?: any, inner?: ValidationError[] } = {}) {
    super({ name: 'ValidationError', message });

    if (details != undefined) {
      this.details = details;
    }

    if (inner != undefined) {
      this.inner = inner;
    }
  }
}
