import { CustomError } from './custom.error';

export class InvalidTokenError extends CustomError {
  static readonly errorName = 'InvalidTokenError';

  constructor(message: string = 'invalid token') {
    super({ message });
  }
}
