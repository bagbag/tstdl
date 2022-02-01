import type { JsonPath } from '#/json-path';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Schema, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type LiteralSchema<T> = Schema<'literal', T, T> & {
  value: T
};

export class LiteralSchemaValidator<T> extends SchemaValidator<LiteralSchema<T>> {
  [test](value: unknown, _options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<LiteralSchema<T>>> {
    if (value === this.schema.value) {
      return { valid: true, value: value as T };
    }

    return { valid: false, error: SchemaError.expectedButGot(String(this.schema.value), String(value), path) };
  }
}

export function literal<T>(value: T, options?: SchemaOptions<LiteralSchema<T>, 'value'>): LiteralSchemaValidator<T> {
  const schema = schemaHelper<LiteralSchema<T>>({
    type: 'literal',
    value,
    ...options
  });

  return new LiteralSchemaValidator(schema);
}
