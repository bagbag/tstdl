import { ValidationError } from './error';
export { ValidationError };

export type EndpointValidator<Input, Output> = (object: Input) => ValidationResult<Output> | Promise<ValidationResult<Output>>;

export type ValidationResult<Output> =
  | { valid: true, value: Output, error?: undefined }
  | { valid: false, value?: undefined, error: ValidationError };
