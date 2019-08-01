import { CustomError } from '@tstdl/base/utils/custom-error';

export class ValidationError extends CustomError {
  readonly details: any;

  constructor(name: string, message: string, details?: any) {
    super(message);

    this.name = name;
    this.details = details;
  }
}
