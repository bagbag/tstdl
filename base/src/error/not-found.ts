import { CustomError } from './custom-error';

export class NotFoundError extends CustomError {
  static readonly errorName = 'NotFoundError';

  constructor(message: string = 'not found') {
    super({ message });
  }
}
