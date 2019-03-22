export type ValidationFunction<T> = (object: T) => ValidationResult;
export type ValidationResult = { valid: true, error?: undefined } | { valid: false, error: any };
