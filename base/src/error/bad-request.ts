import { CustomError } from './custom-error';

export class BadRequestError extends CustomError {
  constructor(message: string = 'bad request') {
    super({ name: BadRequestError.name, message });
  }
}
