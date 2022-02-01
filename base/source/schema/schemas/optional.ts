import type { JsonPath } from '#/json-path';
import { isNull, isUndefined } from '#/utils/type-guards';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Coercible, Schema, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type OptionalSchema<T extends Schema = Schema> = Schema<'optional', SchemaInput<T> | undefined, SchemaOutput<T> | undefined> & Coercible & {
  schema: T
};

export class OptionalSchemaValidator<T extends Schema> extends SchemaValidator<OptionalSchema<T>> {
  private readonly innerValidator: SchemaValidator<T>;

  constructor(innerValidator: SchemaValidator<T>, schema: OptionalSchema<T>) {
    super(schema);

    this.innerValidator = innerValidator;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<OptionalSchema<T>>> {
    if (isUndefined(value)) {
      return { valid: true, value };
    }

    if ((this.schema.coerce ?? options.coerce) && isNull(value)) {
      return { valid: true, value: undefined };
    }

    return this.innerValidator[test](value as SchemaInput<T>, options, path);
  }
}

export function optional<T extends Schema>(innerValidator: SchemaValidator<T>, options?: SchemaOptions<OptionalSchema<T>, 'schema'>): OptionalSchemaValidator<T> {
  const schema = schemaHelper<OptionalSchema<T>>({
    type: 'optional',
    schema: innerValidator.schema,
    ...options
  });

  return new OptionalSchemaValidator(innerValidator, schema);
}
