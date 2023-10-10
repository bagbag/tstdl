import { CustomError } from './custom.error.js';

export class MaxBytesExceededError extends CustomError {
  static readonly errorName = 'MaxBytesExceededError';

  constructor(message: string = 'max bytes exceeded') {
    super({ message });
  }

  static fromBytes(bytes: number): MaxBytesExceededError {
    return new MaxBytesExceededError(`Maximum bytes of ${bytes} exceeded.`);
  }
}
