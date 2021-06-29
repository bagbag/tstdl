import { CustomError } from './custom.error';

export class NotImplementedError extends CustomError {
  static readonly errorName = 'NotImplementedError';

  constructor(message: string = 'not implemented') {
    super({ message });
  }
}
