import { CustomError } from './custom-error';

export class DetailsError<T = any> extends CustomError {
  details: T;

  constructor(message: string, details: T) {
    super({ message });

    this.details = details;
  }
}
