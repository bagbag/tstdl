import { CustomError } from './custom.error.js';

export class NotImplementedError extends CustomError {
  static readonly errorName = 'NotImplementedError';

  constructor(message: string = 'Not implemented.') {
    super({ message });
  }
}
