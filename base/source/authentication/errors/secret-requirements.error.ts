import { CustomError } from '#/errors/custom.error.js';

export class SecretRequirementsError extends CustomError {
  static readonly errorName = 'SecretRequirementsError';

  constructor(message: string = 'Secret requirements not met.') {
    super({ message });
  }
}
