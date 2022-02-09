import { CustomError } from '#/error';
import { isDefined } from '#/utils/type-guards';

export class IndexOutOfBoundsError extends CustomError {
  constructor(index: number, size?: number) {
    const sizeString = isDefined(size) ? ` (size: ${size})` : '';
    super({ message: `index ${index} out of bounds${sizeString}` });
  }
}
