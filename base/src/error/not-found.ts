import { CustomError } from './custom-error';

export class NotFoundError extends CustomError {
  constructor(message: string = 'not found') {
    super({ message });
  }
}
