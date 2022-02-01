import type { JsonPath } from '#/json-path';
import { isRegExp, isString } from '#/utils/type-guards';
import { schemaError, SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Coercible, Schema, SchemaOptions } from '../types';
import { schemaHelper } from '../types';

export type RegExpSchema = Schema<'regexp', unknown, RegExp> & Coercible;

export class RegExpSchemaValidator extends SchemaValidator<RegExpSchema> {
  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<RegExp> {
    if (!isRegExp(value)) {
      if ((this.schema.coerce ?? options.coerce) && isString(value)) {
        try {
          return { valid: true, value: RegExp(value, 'u') };
        }
        catch (error) {
          return { valid: false, error: schemaError(`could not coerce provided string to regular expression: ${(error as Error).message}`, path) };
        }
      }

      return { valid: false, error: SchemaError.expectedButGot('RegExp', typeof value, path) };
    }

    return { valid: true, value };
  }
}

export function regexp(options?: SchemaOptions<RegExpSchema>): RegExpSchemaValidator {
  const schema = schemaHelper<RegExpSchema>({
    type: 'regexp',
    ...options
  });

  return new RegExpSchemaValidator(schema);
}
