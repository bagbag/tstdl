import type { ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { SchemaDefinition, SchemaOptions } from '../types';
import { schemaHelper } from '../types';

export type AnySchemaDefinition = SchemaDefinition<'any', any, any>;

export class AnySchemaValidator extends SchemaValidator<AnySchemaDefinition> {
  [test](value: any): ValidationTestResult<any> {
    return { valid: true, value };
  }
}

export function any(options?: SchemaOptions<AnySchemaDefinition>): AnySchemaValidator {
  const schema = schemaHelper<AnySchemaDefinition>({
    type: 'any',
    ...options
  });

  return new AnySchemaValidator(schema);
}
