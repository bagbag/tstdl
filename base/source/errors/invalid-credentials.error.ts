import { CustomError } from './custom.error.js';

export class InvalidCredentialsError extends CustomError {
  static readonly errorName = 'InvalidCredentialsError';

  constructor(message: string = 'Invalid credentials.') {
    super({ message });
  }
}
