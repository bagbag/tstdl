import * as zod from 'zod';
import { EndpointParametersValidator, ValidationError, ValidationResult } from '../types';

export function validator<T>(schema: zod.Schema<T>): EndpointParametersValidator<unknown, T> {
  return (value: unknown) => validate(schema, value);
}

export function validate<T, U>(schema: zod.Schema<T>, value: U): ValidationResult<T> {
  try {
    const parsed = schema.parse(value);
    return { valid: true, value: parsed };
  }
  catch (error) {
    return { valid: false, error: new ValidationError((error as zod.ZodError).name, (error as zod.ZodError).message, (error as zod.ZodError)) };
  }
}
