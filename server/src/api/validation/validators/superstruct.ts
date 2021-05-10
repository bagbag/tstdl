import { isDefined, isMail, isString } from '@tstdl/base/utils';
import type { Failure, Struct, StructError } from 'superstruct';
import { define } from 'superstruct';
import type { EndpointParametersValidator, ValidationResult } from '../types';
import { ValidationError } from '../types';

export const email = (): Struct<string, null> => define('email', (value) => ((isString(value) && isMail(value)) ? true : 'asd'));

export function validator<T>(struct: Struct<T>, options?: { coerce?: boolean }): EndpointParametersValidator<unknown, T> {
  return (value: unknown) => validate(struct, value, options);
}

export function validate<T, U>(struct: Struct<T>, value: U, options?: { coerce?: boolean }): ValidationResult<T> {
  const [error, result] = struct.validate(value, options);

  if (isDefined(error)) {
    return { valid: false, error: convertError(error) };
  }

  return { valid: true, value: result! };
}

function convertError(error: StructError): ValidationError {
  const failures = error.failures().map((failure) => convertFailure(failure));
  const inner = (failures.length > 0) ? failures : undefined;

  return convertFailure(error, inner);
}

function convertFailure(failure: Failure, inner?: ValidationError[]): ValidationError {
  const details = {
    path: failure.path,
    type: failure.type
  };

  return new ValidationError(failure.message, { details, inner });
}
