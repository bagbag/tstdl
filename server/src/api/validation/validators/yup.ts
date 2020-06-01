import * as yup from 'yup';
import { ValidationError, ValidationResult } from '../types';

let defaultOptions: yup.ValidateOptions = { abortEarly: false };

export function setDefaultYupValidationOptions(options: yup.ValidateOptions): void {
  defaultOptions = options;
}

export function validate<T, U>(schema: yup.Schema<T>, value: U, options: yup.ValidateOptions = defaultOptions): ValidationResult<T> {
  try {
    const parsed = schema.validateSync(value, options);
    return { valid: true, value: parsed };
  }
  catch (error) {
    return { valid: false, error: new ValidationError((error as yup.ValidationError).name, (error as yup.ValidationError).message, (error as yup.ValidationError)) };
  }
}
