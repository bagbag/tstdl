import { CustomError } from '@tstdl/base/error';

export class ValidationError extends CustomError {
  readonly details: any;

  constructor(name: string, message: string, details?: any) {
    super({ name, message });

    this.details = details;
  }
}
