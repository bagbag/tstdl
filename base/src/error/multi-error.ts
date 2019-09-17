import { DetailsError } from './details';

export class MultiError extends DetailsError<Error[]> {
  constructor(errors: Error[], message: string = 'multiple errors occurred') {
    super(message, errors);
  }
}
