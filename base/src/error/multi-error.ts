import { CustomError } from './custom-error';

export class MultiError extends CustomError {
  errors: Error[];

  constructor(errors: Error[], message: string = 'multiple errors occurred') {
    super({ name: 'MultiError', message });

    this.errors = errors;
  }
}
