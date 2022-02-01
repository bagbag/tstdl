import type { JsonPath } from '#/json-path';
import type { Optionalize, Record, StringMap } from '#/types';
import { differenceMaps } from '#/utils/map';
import { schemaError, SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test, testAsync } from '../schema.validator';
import type { Schema, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';
import { NeverSchemaValidator } from './never';

type ObjectOutputType<T extends StringMap<Schema>> = Optionalize<{ [P in keyof T]: SchemaOutput<T[P]> }>;

type ObjectSchemaValidatorEntries<T extends StringMap<Schema>> = { [P in keyof T]: SchemaValidator<T[P]> };

export type ObjectSchema<T extends StringMap<Schema> = StringMap<Schema>> = Schema<'object', unknown, ObjectOutputType<T>> & {
  entries: T
};

export class ObjectSchemaValidator<T extends StringMap<Schema>> extends SchemaValidator<ObjectSchema<T>> {
  private readonly validatorEntries: Map<PropertyKey, SchemaValidator>;

  constructor(validators: ObjectSchemaValidatorEntries<T>, schema: ObjectSchema<T>) {
    super(schema);

    this.validatorEntries = new Map(Object.entries(validators));
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<ObjectOutputType<T>> {
    const testBaseResult = this._testBase(value, options, path);

    if (!testBaseResult.valid) {
      return testBaseResult;
    }

    const resultObject: Record = {};

    for (const [key, innerValue] of testBaseResult.value) {
      if (!this.validatorEntries.has(key)) {
        if (options.mask) {
          continue;
        }

        return { valid: false, error: schemaError(`unexpected key ${key}`, path.add(key)) };
      }

      const validator = this.validatorEntries.get(key)!;

      const innerValueValidationTestResult = validator[test](innerValue, options, path.add(key));

      if (!innerValueValidationTestResult.valid) {
        return innerValueValidationTestResult;
      }

      resultObject[key] = innerValueValidationTestResult.value;
    }

    return { valid: true, value: resultObject as ObjectOutputType<T> };
  }

  async [testAsync](value: unknown, options: DefinedValidationOptions, path: JsonPath): Promise<ValidationTestResult<ObjectOutputType<T>>> {
    const testBaseResult = this._testBase(value, options, path);

    if (!testBaseResult.valid) {
      return testBaseResult;
    }

    const resultObject: Record = {};

    for (const [key, innerValue] of testBaseResult.value) {
      if (!this.validatorEntries.has(key)) {
        if (options.mask) {
          continue;
        }

        return { valid: false, error: schemaError(`unexpected key ${key}`, path.add(key)) };
      }

      const validator = this.validatorEntries.get(key)!;

      const innerValueValidationTestResult = await validator[testAsync](innerValue, options, path.add(key));

      if (!innerValueValidationTestResult.valid) {
        return innerValueValidationTestResult;
      }

      resultObject[key] = innerValueValidationTestResult.value;
    }

    return { valid: true, value: resultObject as ObjectOutputType<T> };
  }

  private _testBase(value: unknown, _options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<Map<string, any>> {
    const typeResult = this.ensureType('object', value, path);

    if (!typeResult.valid) {
      return typeResult;
    }
    else if (value === null) {
      return { valid: false, error: SchemaError.expectedButGot('object', 'null', path) };
    }

    const valueEntries = new Map(Object.entries(value as Record));
    const missingKeys = differenceMaps(this.validatorEntries, valueEntries).filter(([key]) => !(this.validatorEntries.get(key)! instanceof NeverSchemaValidator));

    if (missingKeys.length > 0) {
      const keys = missingKeys.map((entry) => entry[0]).join(', ');
      return { valid: false, error: schemaError(`missing entries: ${keys}`, path) };
    }

    return { valid: true, value: valueEntries };
  }
}

export function object<T extends StringMap<Schema>>(entries: ObjectSchemaValidatorEntries<T>, options?: SchemaOptions<ObjectSchema<T>, 'entries'>): ObjectSchemaValidator<T> {
  const validatorEntries = Object.entries(entries) as [PropertyKey, SchemaValidator][];
  const mappedValidatorEntries = validatorEntries.map(([key, value]) => [key, value.schema] as const);

  const schema = schemaHelper<ObjectSchema<T>>({
    type: 'object',
    entries: Object.fromEntries(mappedValidatorEntries) as T,
    ...options
  });

  return new ObjectSchemaValidator(entries, schema);
}
