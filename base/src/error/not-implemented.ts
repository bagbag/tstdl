import { CustomError } from './custom-error';

export class NotImplementedError extends CustomError {
  constructor(message: string = 'not implemented') {
    super({ name: NotImplementedError.name, message });
  }
}
