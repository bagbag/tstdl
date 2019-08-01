import { ValidationError } from './error';

export type ValidationFunction<Input, Output = Input> = (object: Input) => ValidationResult<Output>;

export type ValidationResult<Output> =
  | { valid: true, value: Output, error?: undefined }
  | { valid: false, value?: undefined, error: ValidationError | NonNullable<any> };
