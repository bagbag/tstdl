import { CustomError, type CustomErrorOptions } from '#/errors/custom.error.js';
import type { JsonPath } from '#/json-path/index.js';
import type { AbstractConstructor, OneOrMany, TypedOmit, UndefinableJson } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import type { ErrorExtraInfo } from '#/utils/format-error.js';
import { isArray, isDefined, isFunction, isNotNullOrUndefined, isString } from '#/utils/type-guards.js';

export type SchemaErrorOptions = Pick<CustomErrorOptions, 'fast'> & {
  path: string | JsonPath,
  details?: UndefinableJson,
  inner?: OneOrMany<SchemaError>,
  cause?: any
};

export class SchemaError extends CustomError implements ErrorExtraInfo {
  static readonly errorName = 'SchemaError';

  readonly path: string;
  readonly details?: UndefinableJson;
  readonly inner?: OneOrMany<SchemaError>;

  constructor(message: string, options: SchemaErrorOptions, cause?: any) {
    super({ message, cause: cause ?? options.cause, fast: options.fast });

    this.path = isString(options.path) ? options.path : options.path.path;

    if (isDefined(options.inner) && (!isArray(options.inner) || (options.inner.length > 0))) {
      this.inner = isArray(options.inner)
        ? (options.inner.length == 1)
          ? options.inner[0]!
          : options.inner
        : options.inner;
    }

    if (isNotNullOrUndefined(options.details)) {
      this.details = options.details;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  static expectedButGot(expected: OneOrMany<string | AbstractConstructor>, got: string, path: string | JsonPath, options?: TypedOmit<SchemaErrorOptions, 'path'> & { customMessage?: string }): SchemaError {
    const expectedNames = toArray(expected).map((e) => isFunction(e) ? e.name : e);

    const expectedString = expectedNames.length == 1
      ? expectedNames[0]!
      : `(${expectedNames.join(' | ')})`;

    const customMessage = isDefined(options?.customMessage) ? `: ${options.customMessage}` : '.';
    const message = `Expected ${expectedString} but got ${got}${customMessage}`;
    return new SchemaError(message, { path, ...options });
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  static couldNotCoerce(expected: OneOrMany<string | AbstractConstructor>, got: string, path: string | JsonPath, options: TypedOmit<SchemaErrorOptions, 'path'> & { customMessage?: string }): SchemaError {
    const expectedNames = toArray(expected).map((e) => isFunction(e) ? e.name : e);

    const expectedString = expectedNames.length == 1
      ? expectedNames[0]!
      : `[${expectedNames.join(', ')}]`;

    const customMessageString = isDefined(options.customMessage) ? `: ${options.customMessage}` : '.';
    const errorMessage = `Could not coerce ${got} to ${expectedString}${customMessageString}`;
    return new SchemaError(errorMessage, { path, ...options });
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
