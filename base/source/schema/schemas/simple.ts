import type { JsonPath } from '#/json-path/json-path.js';
import type { AbstractConstructor, OneOrMany } from '#/types.js';
import { isDefined, isError, isNotNull, isNull, isUndefined } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';
import { SchemaError } from '../schema.error.js';
import { Schema, type SchemaOptions, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import type { CoerceResult, Coercible, ConstraintResult } from '../types.js';

export type SimpleSchemaOptions<T> = SchemaOptions<T> & Coercible;

type SimpleSchemaRefinements<T> = {
  coercers?: SimpleSchemaCoercers<T>,
  constraints?: (SimpleSchemaConstraint<T> | null)[],
  gotValueFormatter?: SimpleSchemaGotValueFormatter,
};

export type SimpleSchemaCoercers<T> = {
  string?: (value: string, path: JsonPath, options: SchemaTestOptions) => CoerceResult<T>,
  number?: (value: number, path: JsonPath, options: SchemaTestOptions) => CoerceResult<T>,
  boolean?: (value: boolean, path: JsonPath, options: SchemaTestOptions) => CoerceResult<T>,
  bigint?: (value: bigint, path: JsonPath, options: SchemaTestOptions) => CoerceResult<T>,
  undefined?: (value: undefined, path: JsonPath, options: SchemaTestOptions) => CoerceResult<T>,
  null?: (value: null, path: JsonPath, options: SchemaTestOptions) => CoerceResult<T>,
  all?: (value: unknown, path: JsonPath, options: SchemaTestOptions) => CoerceResult<T>,
};

export type SimpleSchemaConstraint<T> = (value: T) => ConstraintResult;

export type SimpleSchemaGotValueFormatter = (value: unknown) => string;

export abstract class SimpleSchema<T> extends Schema<T> {
  readonly #guardFn: (value: any) => value is T;
  readonly #expected: OneOrMany<string | AbstractConstructor>;
  readonly #options: SimpleSchemaOptions<T>;
  readonly #coercers: SimpleSchemaCoercers<T>;
  readonly #constraints: SimpleSchemaConstraint<T>[];
  readonly #gotValueFormatter: SimpleSchemaGotValueFormatter;

  constructor(expected: OneOrMany<string | AbstractConstructor>, guardFn: (value: any) => value is T, options: SimpleSchemaOptions<T> = {}, refinements: SimpleSchemaRefinements<T> = {}) {
    super(options);

    this.#expected = expected;
    this.#guardFn = guardFn;
    this.#options = options;
    this.#coercers = refinements.coercers ?? {};
    this.#constraints = refinements.constraints?.filter(isNotNull) ?? [];
    this.#gotValueFormatter = refinements.gotValueFormatter ?? typeOf;
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T> {
    let result: SchemaTestResult<T> | undefined;

    if (this.#guardFn(value)) {
      result = { valid: true, value };
    }
    else if ((this.#options.coerce ?? options.coerce) == true) {
      const type = typeof value;
      const coerceType = isNull(value) ? 'null' : type;

      const coerceFn = (this.#coercers[coerceType as keyof SimpleSchemaCoercers<T>] ?? this.#coercers.all) as SimpleSchemaCoercers<T>['all'];

      if (isDefined(coerceFn)) {
        const coerceResult = coerceFn(value, path, options);

        if (coerceResult.success) {
          if (!coerceResult.valid) {
            return this._test(coerceResult.value, path, options);
          }

          result = { valid: true, value: coerceResult.value };
        }
        else if (isDefined(coerceResult.error)) {
          result = { valid: false, error: coerceResult.error };
        }
      }
    }

    if (isUndefined(result)) {
      return { valid: false, error: SchemaError.expectedButGot(this.#expected, this.#gotValueFormatter(value), path, { fast: options.fastErrors }) };
    }

    for (const constraint of this.#constraints) {
      const constraintResult = constraint(result.value!);

      if (!constraintResult.success) {
        if (isError(constraintResult.error)) {
          return { valid: false, error: constraintResult.error };
        }

        return { valid: false, error: new SchemaError(`Constraint validation failed: ${constraintResult.error}`, { path, fast: options.fastErrors }) };
      }
    }

    return result;
  }
}
