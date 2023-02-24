import { CustomError } from './custom.error.js';

export class NotFoundError extends CustomError {
  static readonly errorName = 'NotFoundError';

  constructor(message: string = 'not found') {
    super({ message });
  }
}
