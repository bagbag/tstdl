import { CustomError } from './custom.error.js';

export class AssertionError extends CustomError {
  static readonly errorName = 'AssertionError';

  constructor(message: string) {
    super({ message });
  }
}
