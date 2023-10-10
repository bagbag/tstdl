import { CustomError } from './custom.error.js';

export class TimeoutError extends CustomError {
  static readonly errorName = 'TimeoutError';

  constructor(message: string = 'Operation timed out.') {
    super({ message });
  }
}
