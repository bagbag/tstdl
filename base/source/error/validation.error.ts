import { CustomError } from './custom.error';

export class ValidationError extends CustomError {
  static readonly errorName = 'ValidationError';

  readonly details?: any;
  readonly inner?: ValidationError[];

  constructor(message: string, { details, inner }: { details?: any, inner?: ValidationError[] } = {}) {
    super({ message });

    if (details != undefined) {
      this.details = details;
    }

    if (inner != undefined) {
      this.inner = inner;
    }
  }
}
