import type { JsonPath } from '#/json-path';
import { SchemaError } from '../schema.error';
import type { CoercerMap, DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Schema, SchemaOptions } from '../types';
import { schemaHelper } from '../types';

const coercerMap: CoercerMap<boolean> = {
  string: (string, path) => {
    const lowered = string.toLowerCase();

    switch (lowered) {
      case 'true':
      case '1':
      case 'yes':
        return { valid: true, value: true };

      case 'false':
      case '0':
      case 'no':
        return { valid: true, value: false };

      default:
        return { valid: false, error: SchemaError.expectedButGot('boolean', 'string', path) };
    }
  },
  number: (number, path) => (
    (number == 1) ? { valid: true, value: true }
      : (number == 0) ? { valid: true, value: false }
        : { valid: false, error: SchemaError.expectedButGot('boolean', 'number', path) }
  )
};

export type BooleanSchema = Schema<'boolean', unknown, boolean>;

export class BooleanSchemaValidator extends SchemaValidator<BooleanSchema> {
  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<boolean> {
    const result = super.ensureType('boolean', value, options, path, coercerMap);

    if (!result.valid) {
      return result;
    }

    return { valid: true, value: result.value };
  }
}

export function boolean(options?: SchemaOptions<BooleanSchema>): BooleanSchemaValidator {
  const schema = schemaHelper<BooleanSchema>({
    type: 'boolean',
    ...options
  });

  return new BooleanSchemaValidator(schema);
}
