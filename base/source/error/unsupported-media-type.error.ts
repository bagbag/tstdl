import { CustomError } from './custom.error.js';

export class UnsupportedMediaTypeError extends CustomError {
  static readonly errorName = 'UnsupportedMediaTypeError';

  constructor(message: string = 'Unsupported media type.') {
    super({ message });
  }
}
