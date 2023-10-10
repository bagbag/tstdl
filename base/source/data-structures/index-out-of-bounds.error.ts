import { CustomError } from '#/errors/custom.error.js';
import { isDefined } from '#/utils/type-guards.js';

export class IndexOutOfBoundsError extends CustomError {
  constructor({ index, count, size }: { index: number, count?: number, size?: number }) {
    const countString = (isDefined(count) && (count > 1)) ? `with count of ${count} ` : '';
    const sizeString = isDefined(size) ? ` (size: ${size})` : '';

    super({ message: `index ${index}${countString} is out of bounds${sizeString}` });
  }
}
