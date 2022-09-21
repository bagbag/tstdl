import { CustomError } from '#/error';
import type { JsonPath } from '#/json-path';
import type { OneOrMany, UndefinableJson } from '#/types';
import type { ErrorExtraInfo } from '#/utils/format-error';
import { isArray, isDefined, isNotNullOrUndefined, isString } from '#/utils/type-guards';

export type SchemaErrorOptions = {
  path: string | JsonPath,
  inner?: OneOrMany<SchemaError>,
  details?: any
};

export class SchemaError extends CustomError implements ErrorExtraInfo {
  static readonly errorName = 'SchemaError';

  readonly path: string;
  readonly inner?: OneOrMany<SchemaError>;
  readonly details: any;

  constructor(message: string, options: SchemaErrorOptions, cause?: any) {
    super({ message, cause });

    this.path = isString(options.path) ? options.path : options.path.path;

    if (isDefined(options.inner) && (!isArray(options.inner) || (options.inner.length > 0))) {
      this.inner = isArray(options.inner)
        ? (options.inner.length == 1)
          ? options.inner[0]!
          : options.inner
        : options.inner;
    }

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

  getExtraInfo(includeMessage: boolean = false): UndefinableJson | undefined {
    const obj: UndefinableJson = {
      path: this.path
    };

    if (includeMessage) {
      obj['message'] = this.message;
    }

    if (isDefined(this.inner)) {
      obj['inner'] = isArray(this.inner)
        ? this.inner.map((error) => error.getExtraInfo(true))
        : this.inner.getExtraInfo(true);
    }

    if (isNotNullOrUndefined(this.details)) {
      obj['details'] = this.details;
    }

    return obj;
  }
}

export function schemaError(message: string, path: string | JsonPath): SchemaError {
  return new SchemaError(message, { path });
}
