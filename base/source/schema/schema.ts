import type { IsEqual, Or } from 'type-fest';

import { JsonPath } from '#/json-path/json-path.js';
import type { AbstractConstructor } from '#/types.js';
import type { SchemaError } from './schema.error.js';
import type { Coercible, Maskable } from './types.js';

export type SchemaTestOptions = Coercible & Maskable & {
  /**
   * Use fast errors which can improve performance a lot but misses detailed stack traces.
   */
  fastErrors?: boolean
};

export type SchemaTestResult<T> =
  | { valid: true, value: T, error?: undefined }
  | { valid: false, value?: undefined, error: SchemaError };

type NormalizePrimitiveToConstructor<T> =
  Or<IsEqual<T, string>, IsEqual<T, String>> extends true ? typeof String
  : Or<IsEqual<T, number>, IsEqual<T, Number>> extends true ? typeof Number
  : Or<IsEqual<T, boolean>, IsEqual<T, Boolean>> extends true ? typeof Boolean
  : Or<IsEqual<T, bigint>, IsEqual<T, BigInt>> extends true ? typeof BigInt
  : Or<IsEqual<T, symbol>, IsEqual<T, Symbol>> extends true ? typeof Symbol
  : never;

type NormalizeConstructorToPrimitve<T> =
  | IsEqual<T, String> extends true ? string
  : IsEqual<T, Number> extends true ? number
  : IsEqual<T, Boolean> extends true ? boolean
  : IsEqual<T, BigInt> extends true ? bigint
  : IsEqual<T, Symbol> extends true ? symbol
  : T;

export type SchemaTestable<T = unknown> = Schema<T> | AbstractConstructor<T> | NormalizePrimitiveToConstructor<T>;

export type SchemaOutput<T extends SchemaTestable> = T extends SchemaTestable<infer U> ? U : never;

export declare const OPTIONAL: unique symbol;

export abstract class Schema<T = unknown> {
  abstract readonly name: string;

  declare readonly [OPTIONAL]: boolean;

  /**
   * Test an unknown value to see whether it corresponds to the schema.
   * @param schema schema to test against
   * @param value value to test
   * @param options validation options
   * @returns test result
   */
  static readonly test: <T>(schema: SchemaTestable<T>, value: unknown, options?: SchemaTestOptions) => SchemaTestResult<T>;

  /**
   * Validate an unknown value to see whether it corresponds to the schema.
   * @param schema schema to validate against
   * @param value value to validate
   * @param options validation options
   * @returns validation result
   */
  static readonly validate: <T>(schema: SchemaTestable<T>, value: unknown, options?: SchemaTestOptions) => boolean;

  /**
   * Asserts an unknown value to be valid according to the schema.
   * @param schema schema to validate against
   * @param value value to validate
   * @param options validation options
   */
  static readonly assert: <T>(schema: SchemaTestable<T>, value: unknown, options?: SchemaTestOptions) => asserts value is T;

  /**
   * Parse an unknown value to comply with the scheme.
   * @param schema schema to validate against
   * @param value value to validate
   * @param options validation options
   * @returns validation result
   */
  static readonly parse: <T>(schema: SchemaTestable<T>, value: unknown, options?: SchemaTestOptions) => T;

  /**
   * Test an unknown value to see whether it corresponds to the schema.
   * @param schema schema to test against
   * @param value value to test
   * @param options validation options
   * @returns test result with either the value or validation error
   */
  test(value: any, options: SchemaTestOptions = {}): SchemaTestResult<T> {
    return this._test(value, JsonPath.ROOT, options);
  }

  /**
   * Validate an unknown value to see whether it corresponds to the schema.
   * @param schema schema to validate against
   * @param value value to validate
   * @param options validation options
   * @returns validation result. Throws if validation fails
   */
  validate(value: any, options: SchemaTestOptions = {}): boolean {
    const result = this._test(value, JsonPath.ROOT, options);
    return result.valid;
  }

  /**
   * Asserts an unknown value to be valid according to the schema.
   * @param schema schema to validate against
   * @param value value to validate
   * @param options validation options
   */
  assert(value: any, options: SchemaTestOptions = {}): asserts value is T {
    const result = this._test(value, JsonPath.ROOT, options);

    if (!result.valid) {
      throw result.error;
    }
  }

  /**
   * Parse an unknown value to comply with the scheme.
   * @param schema schema to parse against
   * @param value value to parse
   * @param options validation options
   * @returns parsed value
   */
  parse(value: any, options: SchemaTestOptions = {}): T {
    const result = this._test(value, JsonPath.ROOT, options);

    if (result.valid) {
      return result.value;
    }

    throw result.error;
  }

  abstract _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T>;
}
