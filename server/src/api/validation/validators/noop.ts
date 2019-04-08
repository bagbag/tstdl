import { ValidationResult } from '../types';

export function noopValidator(): ValidationResult {
  return { valid: true };
}
