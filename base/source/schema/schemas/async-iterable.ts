import type { JsonPath } from '#/json-path';
import { isAnyIterable } from '#/utils/any-iterable-iterator';
import { mapAsync } from '#/utils/async-iterable-helpers/map';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test, testAsync } from '../schema.validator';
import type { SchemaDefinition, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type AsyncIterableSchemaDefinition<T extends SchemaDefinition> = SchemaDefinition<'asyncIterable', AsyncIterable<SchemaInput<T>>, AsyncIterable<SchemaOutput<T>>> & {
  schema: T
};

export class AsyncIterableSchemaValidator<T extends SchemaDefinition> extends SchemaValidator<AsyncIterableSchemaDefinition<T>> {
  private readonly innerValidator: SchemaValidator<T>;

  constructor(innerValidator: SchemaValidator<T>, schema: AsyncIterableSchemaDefinition<T>) {
    super(schema);

    this.innerValidator = innerValidator;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<AsyncIterableSchemaDefinition<T>>> {
    if (!isAnyIterable(value)) {
      return { valid: false, error: SchemaError.expectedButGot('iterable or async-iterable', typeof value, path) };
    }

    const innerValidator = this.innerValidator;

    const validatedAsyncIterable = mapAsync(value as AsyncIterable<SchemaOutput<T>>, async (innerValue) => {
      const testResult = await innerValidator[testAsync](innerValue as SchemaInput<T>, options, path.add('@asyncIteration'));

      if (!testResult.valid) {
        throw testResult.error;
      }

      return testResult.value;
    });

    return { valid: true, value: validatedAsyncIterable };
  }
}

export function asyncIterable<T extends SchemaDefinition>(schemaValidator: SchemaValidator<T>, options?: SchemaOptions<AsyncIterableSchemaDefinition<T>, 'schema'>): AsyncIterableSchemaValidator<T> {
  const schema = schemaHelper<AsyncIterableSchemaDefinition<T>>({
    type: 'asyncIterable',
    schema: schemaValidator.schema,
    ...options
  });

  return new AsyncIterableSchemaValidator(schemaValidator, schema);
}
