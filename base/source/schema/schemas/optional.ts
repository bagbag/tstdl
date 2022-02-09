import type { JsonPath } from '#/json-path';
import { isNull, isUndefined } from '#/utils/type-guards';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Coercible, SchemaDefinition, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type OptionalSchemaDefinition<T extends SchemaDefinition = SchemaDefinition> = SchemaDefinition<'optional', SchemaInput<T> | undefined, SchemaOutput<T> | undefined> & Coercible & {
  schema: T
};

export class OptionalSchemaValidator<T extends SchemaDefinition> extends SchemaValidator<OptionalSchemaDefinition<T>> {
  private readonly innerValidator: SchemaValidator<T>;

  constructor(innerValidator: SchemaValidator<T>, schema: OptionalSchemaDefinition<T>) {
    super(schema);

    this.innerValidator = innerValidator;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<OptionalSchemaDefinition<T>>> {
    if (isUndefined(value)) {
      return { valid: true, value };
    }

    if ((this.schema.coerce ?? options.coerce) && isNull(value)) {
      return { valid: true, value: undefined };
    }

    return this.innerValidator[test](value as SchemaInput<T>, options, path);
  }
}

export function optional<T extends SchemaDefinition>(innerValidator: SchemaValidator<T>, options?: SchemaOptions<OptionalSchemaDefinition<T>, 'schema'>): OptionalSchemaValidator<T> {
  const schema = schemaHelper<OptionalSchemaDefinition<T>>({
    type: 'optional',
    schema: innerValidator.schema,
    ...options
  });

  return new OptionalSchemaValidator(innerValidator, schema);
}
