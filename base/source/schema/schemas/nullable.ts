import type { JsonPath } from '#/json-path';
import { isNull, isUndefined } from '#/utils/type-guards';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Coercible, SchemaDefinition, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type NullableSchemaDefinition<T extends SchemaDefinition = SchemaDefinition> = SchemaDefinition<'nullable', SchemaInput<T> | null, SchemaOutput<T> | null> & Coercible & {
  schema: T
};

export class NullableSchemaValidator<T extends SchemaDefinition> extends SchemaValidator<NullableSchemaDefinition<T>> {
  private readonly innerValidator: SchemaValidator<T>;

  constructor(innerValidator: SchemaValidator<T>, schema: NullableSchemaDefinition<T>) {
    super(schema);

    this.innerValidator = innerValidator;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<NullableSchemaDefinition<T>>> {
    if (isNull(value)) {
      return { valid: true, value };
    }

    if ((this.schema.coerce ?? options.coerce) && isUndefined(value)) {
      return { valid: true, value: null };
    }

    return this.innerValidator[test](value as SchemaInput<T>, options, path);
  }
}

export function nullable<T extends SchemaDefinition>(innerValidator: SchemaValidator<T>, options?: SchemaOptions<NullableSchemaDefinition<T>, 'schema'>): NullableSchemaValidator<T> {
  const schema = schemaHelper<NullableSchemaDefinition<T>>({
    type: 'nullable',
    schema: innerValidator.schema,
    ...options
  });

  return new NullableSchemaValidator<T>(innerValidator, schema);
}
