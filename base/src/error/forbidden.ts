import { CustomError } from './custom-error';

export class ForbiddenError extends CustomError {
  constructor(message: string = 'forbidden') {
    super({ name: 'ForbiddenError', message });
  }
}
