import type { JsonPath } from '#/json-path';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { SchemaDefinition, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type LiteralSchemaDefinition<T> = SchemaDefinition<'literal', T, T> & {
  value: T
};

export class LiteralSchemaValidator<T> extends SchemaValidator<LiteralSchemaDefinition<T>> {
  [test](value: unknown, _options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<LiteralSchemaDefinition<T>>> {
    if (value === this.schema.value) {
      return { valid: true, value: value as T };
    }

    return { valid: false, error: SchemaError.expectedButGot(String(this.schema.value), String(value), path) };
  }
}

export function literal<T>(value: T, options?: SchemaOptions<LiteralSchemaDefinition<T>, 'value'>): LiteralSchemaValidator<T> {
  const schema = schemaHelper<LiteralSchemaDefinition<T>>({
    type: 'literal',
    value,
    ...options
  });

  return new LiteralSchemaValidator(schema);
}
