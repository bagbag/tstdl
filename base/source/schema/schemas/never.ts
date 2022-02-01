import type { JsonPath } from '#/json-path';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Schema, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type NeverSchema = Schema<'never', unknown, never>;

export class NeverSchemaValidator extends SchemaValidator<NeverSchema> {
  [test](value: unknown, _options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<NeverSchema>> {
    return { valid: false, error: SchemaError.expectedButGot('never', typeof value, path) };
  }
}

export function never(options?: SchemaOptions<NeverSchema>): NeverSchemaValidator {
  const schema = schemaHelper<NeverSchema>({
    type: 'never',
    ...options
  });

  return new NeverSchemaValidator(schema);
}
