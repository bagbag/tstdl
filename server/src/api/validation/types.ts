export type ValidationFunction = (object: unknown) => ValidationResult;
export type ValidationResult = { valid: true, error: undefined } | { valid: false, error: any };
