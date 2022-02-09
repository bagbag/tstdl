import type { JsonPath } from '#/json-path';
import { isArray } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test, testAsync } from '../schema.validator';
import type { SchemaDefinition, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type ArraySchemaDefinition<T extends SchemaDefinition = SchemaDefinition> = SchemaDefinition<'array', unknown, SchemaOutput<T>[]> & {
  schema: T
};

export class ArraySchemaValidator<T extends SchemaDefinition> extends SchemaValidator<ArraySchemaDefinition<T>> {
  private readonly innerValidator: SchemaValidator<T>;

  constructor(innerValidator: SchemaValidator<T>, schema: ArraySchemaDefinition<T>) {
    super(schema);

    this.innerValidator = innerValidator;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<ArraySchemaDefinition<T>>> {
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

  async [testAsync](value: unknown, options: DefinedValidationOptions, path: JsonPath): Promise<ValidationTestResult<SchemaOutput<ArraySchemaDefinition<T>>>> {
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

export function array<T extends SchemaDefinition>(innerValidator: SchemaValidator<T>, options?: SchemaOptions<ArraySchemaDefinition<T>, 'schema'>): ArraySchemaValidator<T> {
  const schema = schemaHelper<ArraySchemaDefinition<T>>({
    type: 'array',
    schema: innerValidator.schema,
    ...options
  });

  return new ArraySchemaValidator(innerValidator, schema);
}
