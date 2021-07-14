import { CustomError } from './custom.error';

export class UnauthorizedError extends CustomError {
  static readonly errorName = 'UnauthorizedError';

  constructor(message: string = 'unauthorized') {
    super({ message });
  }
}
