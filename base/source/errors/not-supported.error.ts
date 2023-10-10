import type { EnumerationObject } from '#/types.js';
import { enumValueName } from '#/utils/enum.js';
import { CustomError } from './custom.error.js';

export class NotSupportedError extends CustomError {
  static readonly errorName = 'NotSupportedError';

  constructor(message: string = 'Not supported.') {
    super({ message });
  }

  static fromEnum(enumeration: EnumerationObject, name: string, value: any): NotSupportedError {
    const valueName = enumValueName(enumeration, value);
    return new NotSupportedError(`${name} "${valueName}" is not supported.`);
  }
}
