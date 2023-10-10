import { CustomError } from './custom.error.js';

export class UnauthorizedError extends CustomError {
  static readonly errorName = 'UnauthorizedError';

  constructor(message: string = 'Unauthorized') {
    super({ message });
  }
}
