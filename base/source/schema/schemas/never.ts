import type { JsonPath } from '#/json-path';
import { typeOf } from '#/utils/type-of';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { SchemaDefinition, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type NeverSchemaDefinition = SchemaDefinition<'never', unknown, never>;

export class NeverSchemaValidator extends SchemaValidator<NeverSchemaDefinition> {
  [test](value: unknown, _options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<NeverSchemaDefinition>> {
    return { valid: false, error: SchemaError.expectedButGot('never', typeOf(value), path) };
  }
}

export function never(options?: SchemaOptions<NeverSchemaDefinition>): NeverSchemaValidator {
  const schema = schemaHelper<NeverSchemaDefinition>({
    type: 'never',
    ...options
  });

  return new NeverSchemaValidator(schema);
}
