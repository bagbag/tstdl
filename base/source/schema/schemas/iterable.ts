import type { JsonPath } from '#/json-path';
import { isIterable } from '#/utils/iterable-helpers/is-iterable';
import { map } from '#/utils/iterable-helpers/map';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Schema, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type IterableSchema<T extends Schema> = Schema<'iterable', Iterable<SchemaInput<T>>, Iterable<SchemaOutput<T>>> & {
  schema: T
};

export class IterableSchemaValidator<T extends Schema> extends SchemaValidator<IterableSchema<T>> {
  private readonly innerValidator: SchemaValidator<T>;

  constructor(innerValidator: SchemaValidator<T>, schema: IterableSchema<T>) {
    super(schema);

    this.innerValidator = innerValidator;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<IterableSchema<T>>> {
    if (!isIterable(value)) {
      return { valid: false, error: SchemaError.expectedButGot('iterable', typeof value, path) };
    }

    const innerValidator = this.innerValidator;

    const validatedIterable = map(value as Iterable<SchemaOutput<T>>, (innerValue) => {
      const testResult = innerValidator[test](innerValue as SchemaInput<T>, options, path.add('@iteration'));

      if (!testResult.valid) {
        throw testResult.error;
      }

      return testResult.value;
    });

    return { valid: true, value: validatedIterable };
  }
}

export function iterable<T extends Schema>(schemaValidator: SchemaValidator<T>, options?: SchemaOptions<IterableSchema<T>, 'schema'>): IterableSchemaValidator<T> {
  const schema = schemaHelper<IterableSchema<T>>({
    type: 'iterable',
    schema: schemaValidator.schema,
    ...options
  });

  return new IterableSchemaValidator(schemaValidator, schema);
}
