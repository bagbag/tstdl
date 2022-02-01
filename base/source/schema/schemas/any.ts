import type { ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Schema, SchemaOptions } from '../types';
import { schemaHelper } from '../types';

export type AnySchema = Schema<'any'>;

export class AnySchemaValidator extends SchemaValidator<AnySchema> {
  [test](value: any): ValidationTestResult<any> {
    return { valid: true, value };
  }
}

export function any(options?: SchemaOptions<AnySchema>): AnySchemaValidator {
  const schema = schemaHelper<AnySchema>({
    type: 'any',
    ...options
  });

  return new AnySchemaValidator(schema);
}
