import type { EnumerationObject, EnumerationValue } from '#/types';
import { isNumber } from '#/utils/type-guards';
import { CustomError } from './custom.error';

export class NotSupportedError extends CustomError {
  static readonly errorName = 'NotSupportedError';

  constructor(message: string = 'Not supported.') {
    super({ message });
  }

  static fromEnum(enumeration: EnumerationObject, name: string, value: EnumerationValue): NotSupportedError {
    const valueName = isNumber(value) ? enumeration[value] ?? value : value;

    return new NotSupportedError(`${name} "${valueName}" is not supported.`);
  }
}
