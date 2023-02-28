import { CustomError } from '#/error/custom.error';

export class SecretRequirementsError extends CustomError {
  static readonly errorName = 'SecretRequirementsError';

  constructor(message: string = 'Secret requirements not met.') {
    super({ message });
  }
}
