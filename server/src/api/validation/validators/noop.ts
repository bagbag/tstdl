import { ValidationResult } from '../types';

export function noopValidator<T>(value: T): ValidationResult<T> {
  return { valid: true, value };
}
