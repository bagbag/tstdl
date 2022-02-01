import type { ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Schema, SchemaOptions } from '../types';
import { schemaHelper } from '../types';

export type UnknownSchema = Schema<'unknown'>;

export class UnknownSchemaValidator extends SchemaValidator<UnknownSchema> {
  [test](value: unknown): ValidationTestResult<unknown> {
    return { valid: true, value };
  }
}

export function unknown(options?: SchemaOptions<UnknownSchema>): UnknownSchemaValidator {
  const schema = schemaHelper<UnknownSchema>({
    type: 'unknown',
    ...options
  });

  return new UnknownSchemaValidator(schema);
}
