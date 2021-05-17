import { CustomError } from './custom-error';

export class UnsupportedMediaTypeError extends CustomError {
  static readonly errorName = 'UnsupportedMediaTypeError';

  constructor(message: string = 'unsupported media type') {
    super({ message });
  }
}
