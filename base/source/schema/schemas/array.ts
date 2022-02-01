import type { JsonPath } from '#/json-path';
import { isArray } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test, testAsync } from '../schema.validator';
import type { Schema, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type ArraySchema<T extends Schema = Schema> = Schema<'array', unknown, SchemaOutput<T>[]> & {
  schema: T
};

export class ArraySchemaValidator<T extends Schema> extends SchemaValidator<ArraySchema<T>> {
  private readonly innerValidator: SchemaValidator<T>;

  constructor(innerValidator: SchemaValidator<T>, schema: ArraySchema<T>) {
    super(schema);

    this.innerValidator = innerValidator;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<ArraySchema<T>>> {
    if (!isArray(value)) {
      return { valid: false, error: SchemaError.expectedButGot('array', typeof value, path) };
    }

    const validatedArray: SchemaOutput<T>[] = [];

    for (let i = 0; i < value.length; i++) {
      const innerTestResult = this.innerValidator[test](value[i] as SchemaInput<T>, options, path.add(i));

      if (!innerTestResult.valid) {
        return innerTestResult;
      }

      validatedArray.push(innerTestResult.value);
    }

    return { valid: true, value: validatedArray };
  }

  async [testAsync](value: unknown, options: DefinedValidationOptions, path: JsonPath): Promise<ValidationTestResult<SchemaOutput<ArraySchema<T>>>> {
    if (!isArray(value)) {
      return { valid: false, error: SchemaError.expectedButGot('array', typeof value, path) };
    }

    const validatedArray: SchemaOutput<T>[] = [];

    for (let i = 0; i < value.length; i++) {
      const innerTestResult = await this.innerValidator[testAsync](value[i] as SchemaInput<T>, options, path.add(i));

      if (!innerTestResult.valid) {
        return innerTestResult;
      }

      validatedArray.push(innerTestResult.value);
    }

    return { valid: true, value: validatedArray };
  }
}

export function array<T extends Schema>(innerValidator: SchemaValidator<T>, options?: SchemaOptions<ArraySchema<T>, 'schema'>): ArraySchemaValidator<T> {
  const schema = schemaHelper<ArraySchema<T>>({
    type: 'array',
    schema: innerValidator.schema,
    ...options
  });

  return new ArraySchemaValidator(innerValidator, schema);
}
