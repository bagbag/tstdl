import { emailRegex, isDefined } from '@tstdl/base/utils';
import type { Failure, Struct, StructError } from 'superstruct';
import { coerce, number, pattern, string } from 'superstruct';
import type { SyncEndpointParametersValidator, ValidationResult } from '../types';
import { ValidationError } from '../types';

export type SuperstructOptions = {
  coerce?: boolean,
  mask?: boolean
};

let defaultOptions: SuperstructOptions = {
  coerce: true,
  mask: false
};

export function setDefaultSuperstructOptions(options: SuperstructOptions): void {
  defaultOptions = options;
}

export const email = (): Struct<string, null> => pattern(string(), emailRegex);
export const coerceNumber = (): Struct<number, null> => coerce(number(), string(), (value) => parseFloat(value));
export const lowercased = <T, S>(struct: Struct<T, S>): Struct<T, S> => coerce(struct, string(), (x) => x.toLowerCase());
export const nulledStructSchema = <T>(struct: Struct<T, any>): Struct<T, null> => struct as any as Struct<T, null>;

export function validator<T>(struct: Struct<T>, options: SuperstructOptions = defaultOptions): SyncEndpointParametersValidator<unknown, T> {
  return (value: unknown) => validate(struct, value, options);
}

export function validate<T, U>(struct: Struct<T>, value: U, options: SuperstructOptions = defaultOptions): ValidationResult<T> {
  let result: T | undefined;
  let error: StructError | undefined;

  if (options.mask == true) {
    try {
      result = struct.mask(value);
    }
    catch (_error: unknown) {
      error = _error as StructError;
    }
  }
  else {
    [error, result] = struct.validate(value, { coerce: options.coerce });
  }

  if (isDefined(error)) {
    throw convertError(error);
  }

  return result!;
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
