import type { JsonPath } from '#/json-path';
import type { NonNullOrUndefinable } from '#/types';
import { isNullOrUndefined } from '#/utils/type-guards';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { SchemaDefinition, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type DefaultedSchemaDefinition<T extends SchemaDefinition = SchemaDefinition, U = unknown> = SchemaDefinition<'defaulted', SchemaInput<T> | undefined | null, NonNullOrUndefinable<SchemaOutput<T>> | U> & {
  schema: T,
  defaultValue: U
};

export class DefaultedSchemaValidator<T extends SchemaDefinition, U> extends SchemaValidator<DefaultedSchemaDefinition<T, U>> {
  private readonly innerValidator: SchemaValidator<T>;

  constructor(innerValidator: SchemaValidator<T>, schema: DefaultedSchemaDefinition<T, U>) {
    super(schema);

    this.innerValidator = innerValidator;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<DefaultedSchemaDefinition<T, U>>> {
    if (isNullOrUndefined(value)) {
      return { valid: true, value: this.schema.defaultValue };
    }

    return this.innerValidator[test](value as SchemaInput<T>, options, path) as ValidationTestResult<SchemaOutput<DefaultedSchemaDefinition<T, U>>>;
  }
}

export function defaulted<T extends SchemaDefinition, U>(innerValidator: SchemaValidator<T>, defaultValue: U, options?: SchemaOptions<DefaultedSchemaDefinition<T, U>, 'schema' | 'defaultValue'>): DefaultedSchemaValidator<T, U> {
  const schema = schemaHelper<DefaultedSchemaDefinition<T, U>>({
    type: 'defaulted',
    schema: innerValidator.schema,
    defaultValue,
    ...options
  });

  return new DefaultedSchemaValidator(innerValidator, schema);
}
