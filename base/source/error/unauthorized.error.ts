import { CustomError } from './custom.error';

export class UnauthorizedError extends CustomError {
  static readonly errorName = 'UnauthorizedError';

  constructor(message: string = 'Unauthorized') {
    super({ message });
  }
}
