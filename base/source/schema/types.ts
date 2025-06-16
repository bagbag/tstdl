import type { SchemaError } from './schema.error.js';

export type Coercible = {
  /**
   * Try to convert wrong input into desired output.
   * Can be specified on definition and validation. If specified on both, definition has higher priority
   */
  coerce?: boolean,
};

export type Maskable = {
  /**
   * Remove unspecified fields on input data instead of raising an error.
   * Can be specified on definition and validation. If specified on both, definition has higher priority
   */
  mask?: boolean,
};

export type CoerceResult<T> =
  | { success: true, value: T, valid: boolean }
  | { success: false, value?: undefined, error?: SchemaError };

export type ConstraintResult =
  | { success: true, error?: undefined }
  | { success: false, error: string | SchemaError };
