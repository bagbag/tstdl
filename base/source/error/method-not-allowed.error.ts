import { CustomError } from './custom.error';

export class MethodNotAllowedError extends CustomError {
  static readonly errorName = 'MethodNotAllowedError';

  constructor(message: string = 'method not allowed') {
    super({ message });
  }
}
