import type { ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { SchemaDefinition, SchemaOptions } from '../types';
import { schemaHelper } from '../types';

export type UnknownSchemaDefinition = SchemaDefinition<'unknown'>;

export class UnknownSchemaValidator extends SchemaValidator<UnknownSchemaDefinition> {
  [test](value: unknown): ValidationTestResult<unknown> {
    return { valid: true, value };
  }
}

export function unknown(options?: SchemaOptions<UnknownSchemaDefinition>): UnknownSchemaValidator {
  const schema = schemaHelper<UnknownSchemaDefinition>({
    type: 'unknown',
    ...options
  });

  return new UnknownSchemaValidator(schema);
}
