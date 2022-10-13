import type { CustomErrorOptions } from '#/error/custom.error';
import { CustomError } from '#/error/custom.error';
import type { JsonPath } from '#/json-path';
import type { OneOrMany, TypedOmit, UndefinableJson } from '#/types';
import { toArray } from '#/utils/array/array';
import type { ErrorExtraInfo } from '#/utils/format-error';
import { isArray, isDefined, isNotNullOrUndefined, isString } from '#/utils/type-guards';
import type { ValueType } from './types';
import { getValueTypeName } from './utils';

export type SchemaErrorOptions = Pick<CustomErrorOptions, 'fast'> & {
  path: string | JsonPath,
  inner?: OneOrMany<SchemaError>,
  details?: UndefinableJson,
  cause?: any
};

export class SchemaError extends CustomError implements ErrorExtraInfo {
  static readonly errorName = 'SchemaError';

  readonly path: string;
  readonly inner?: OneOrMany<SchemaError>;
  readonly details?: UndefinableJson;

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
  static expectedButGot(expected: OneOrMany<string | ValueType>, got: string | ValueType, path: string | JsonPath, options: TypedOmit<SchemaErrorOptions, 'path'>): SchemaError {
    const expectedNames = toArray(expected).map((exp) => (isString(exp) ? exp : getValueTypeName(exp)));
    const gotName = isString(got) ? got : getValueTypeName(got);

    const expectedString = expectedNames.length == 1
      ? expectedNames[0]!
      : `[${expectedNames.join(', ')}]`;

    const message = `Expected ${expectedString} but got ${gotName}.`;
    return new SchemaError(message, { path, ...options });
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  static couldNotCoerce(expected: OneOrMany<string | ValueType>, got: string | ValueType, path: string | JsonPath, customMessage: string | undefined, options: TypedOmit<SchemaErrorOptions, 'path'>): SchemaError {
    const expectedNames = toArray(expected).map((exp) => (isString(exp) ? exp : getValueTypeName(exp)));
    const gotText = isString(got) ? got : getValueTypeName(got);

    const expectedString = expectedNames.length == 1
      ? expectedNames[0]!
      : `[${expectedNames.join(', ')}]`;

    const customMessageString = isDefined(customMessage) ? `: ${customMessage}` : '.';
    const errorMessage = `Could not coerce ${gotText} to ${expectedString}${customMessageString}`;
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
