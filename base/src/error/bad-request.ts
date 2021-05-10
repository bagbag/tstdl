import { CustomError } from './custom-error';

export class BadRequestError extends CustomError {
  static readonly errorName = 'BadRequestError';

  constructor(message: string = 'bad request') {
    super({ message });
  }
}
