import * as yup from 'yup';
import type { EndpointParametersValidator, ValidationResult } from '../types';
import { ValidationError } from '../types';

let defaultOptions: yup.ValidateOptions = {
  abortEarly: false,
  stripUnknown: false
};

export function setDefaultYupValidationOptions(options: yup.ValidateOptions): void {
  defaultOptions = options;
}

export function stripNullFromSchema<T>(schema: yup.MixedSchema<T>): yup.MixedSchema<Exclude<T, null>> {
  return schema as yup.MixedSchema<Exclude<T, null>>;
}

export function oneOfSchemas<T>(schemas: yup.Schema<T>[], message: string = 'value did not match any of the allowed schemas'): yup.Schema<T> {
  return yup.mixed<T>().test({
    name: 'one-of-schemas',
    message,
    test(value: any) {
      const errors: yup.ValidationError[] = [];

      for (const schema of schemas) {
        try {
          schema.validateSync(value, this.options);
          return true;
        }
        catch (error: unknown) {
          errors.push(error as yup.ValidationError);
        }
      }

      const error = new yup.ValidationError('none of the provided schemas validated successfully', value, this.path);
      error.inner = errors;

      return error;
    }
  });
}

export function validator<T>(schema: yup.Schema<T>, options?: yup.ValidateOptions): EndpointParametersValidator<unknown, T> {
  return (value: unknown) => validate(schema, value, options);
}

export function validate<T, U>(schema: yup.Schema<T>, value: U, options: yup.ValidateOptions = defaultOptions): ValidationResult<T> {
  try {
    const parsed = schema.validateSync(value, options);
    return { valid: true, value: parsed };
  }
  catch (error: unknown) {
    return { valid: false, error: convertError(error as yup.ValidationError) };
  }
}

function convertError(error: yup.ValidationError): ValidationError {
  const details = {
    name: error.name,
    path: error.path,
    inner: (error.inner.length > 0) ? error.inner.map(convertError) : undefined
  };

  return new ValidationError(error.message, details);
}
