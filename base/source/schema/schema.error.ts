import { CustomError } from '#/error';
import type { JsonPath } from '#/json-path';
import { isNotNullOrUndefined, isString } from '#/utils/type-guards';

export type SchemaErrorOptions = {
  path: string | JsonPath,
  details?: any
};

export class SchemaError extends CustomError {
  static readonly errorName = 'SchemaError';

  readonly path: string;
  readonly details: any;

  constructor(message: string, options: SchemaErrorOptions, cause?: any) {
    super({ message, cause });

    this.path = isString(options.path) ? options.path : options.path.path;

    if (isNotNullOrUndefined(this.details)) {
      this.details = options.details;
    }
  }

  static expectedButGot(expected: string, got: string, path: string | JsonPath): SchemaError {
    const message = `expected ${expected} but got ${got}`;
    return new SchemaError(message, { path });
  }

  static couldNotCoerce(expected: string, got: string, message: string, path: string | JsonPath): SchemaError {
    const errorMessage = `could not coerce ${got} to ${expected}: ${message}`;
    return new SchemaError(errorMessage, { path });
  }
}

export function schemaError(message: string, path: string | JsonPath): SchemaError {
  return new SchemaError(message, { path });
}
