import { CustomError } from './custom.error';

export class AssertionError extends CustomError {
  static readonly errorName = 'AssertionError';

  constructor(message: string) {
    super({ message });
  }
}
