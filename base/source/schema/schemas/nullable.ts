import type { JsonPath } from '#/json-path';
import { isNull, isUndefined } from '#/utils/type-guards';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Schema, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type NullableSchema<T extends Schema = Schema> = Schema<'nullable', SchemaInput<T> | null, SchemaOutput<T> | null> & {
  schema: T
};

export class NullableSchemaValidator<T extends Schema> extends SchemaValidator<NullableSchema<T>> {
  private readonly innerValidator: SchemaValidator<T>;

  constructor(innerValidator: SchemaValidator<T>, schema: NullableSchema<T>) {
    super(schema);

    this.innerValidator = innerValidator;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<NullableSchema<T>>> {
    if (isNull(value)) {
      return { valid: true, value };
    }

    if (options.coerce && isUndefined(value)) {
      return { valid: true, value: null };
    }

    return this.innerValidator[test](value as SchemaInput<T>, options, path);
  }
}

export function nullable<T extends Schema>(innerValidator: SchemaValidator<T>, options?: SchemaOptions<NullableSchema<T>, 'schema'>): NullableSchemaValidator<T> {
  const schema = schemaHelper<NullableSchema<T>>({
    type: 'nullable',
    schema: innerValidator.schema,
    ...options
  });

  return new NullableSchemaValidator<T>(innerValidator, schema);
}
