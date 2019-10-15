import { CustomError } from './custom-error';

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'unauthorized') {
    super({ message });
  }
}
