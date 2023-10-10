import { CustomError } from './custom.error.js';

export class ForbiddenError extends CustomError {
  static readonly errorName = 'ForbiddenError';

  constructor(message: string = 'forbidden') {
    super({ message });
  }
}
