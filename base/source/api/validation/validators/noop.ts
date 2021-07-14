import type { ValidationResult } from '../types';

export function noopValidator<T>(value: T): ValidationResult<T> {
  return value;
}
