import { CustomError } from './custom.error';

export class AssertionError extends CustomError {
  constructor(message: string) {
    super({ name: 'AssertionError', message });
  }
}
