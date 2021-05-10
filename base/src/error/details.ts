import { CustomError } from './custom-error';

export class DetailsError<T = any> extends CustomError {
  static readonly errorName = 'DetailsError';

  details: T;

  constructor(message: string, details: T) {
    super({ message });

    this.details = details;
  }
}
