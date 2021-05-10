import { CustomError } from './custom-error';

export class MultiError extends CustomError {
  static readonly errorName = 'MultiError';

  errors: Error[];

  constructor(errors: Error[], message: string = 'multiple errors occurred') {
    super({ message });

    this.errors = errors;
  }
}
