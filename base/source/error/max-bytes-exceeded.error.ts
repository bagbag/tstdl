import { CustomError } from './custom.error';

export class MaxBytesExceededError extends CustomError {
  static readonly errorName = 'MaxBytesExceededError';

  constructor(message: string = 'max bytes exceeded') {
    super({ message });
  }
}
