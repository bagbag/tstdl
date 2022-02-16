import type { JsonPath } from '#/json-path';
import type { Optionalize, Record, Simplify, SimplifyObject, StringMap } from '#/types';
import { differenceMaps } from '#/utils/map';
import { schemaError, SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test, testAsync } from '../schema.validator';
import type { SchemaDefinition, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';
import { NeverSchemaValidator } from './never';

type ObjectOutputType<T extends StringMap<SchemaDefinition>> = Simplify<Optionalize<{ [P in keyof T]: SchemaOutput<T[P]> }>>;

type ObjectSchemaValidatorEntries<T extends StringMap<SchemaDefinition>> = { [P in keyof T]: SchemaValidator<T[P]> };

export type ObjectSchemaDefinition<T extends StringMap<SchemaDefinition> = StringMap<SchemaDefinition>> = SchemaDefinition<'object', unknown, ObjectOutputType<T>> & {
  entries: T
};

type ObjectAssign<A extends StringMap<SchemaDefinition>, B extends StringMap<SchemaDefinition>> = SimplifyObject<Omit<A, keyof B> & B>;

export class ObjectSchemaValidator<T extends StringMap<SchemaDefinition>> extends SchemaValidator<ObjectSchemaDefinition<T>> {
  private readonly validatorEntries: Map<PropertyKey, SchemaValidator>;

  constructor(validators: ObjectSchemaValidatorEntries<T>, schema: ObjectSchemaDefinition<T>) {
    super(schema);

    this.validatorEntries = new Map(Object.entries(validators));
  }

  static assign<A extends StringMap<SchemaDefinition>, B extends StringMap<SchemaDefinition>>(a: ObjectSchemaValidator<A>, b: ObjectSchemaValidator<B>): ObjectSchemaValidator<ObjectAssign<A, B>> {
    const validatorEntries = Object.fromEntries([...a.validatorEntries.entries(), ...b.validatorEntries.entries()]) as ObjectSchemaValidatorEntries<A & B>;

    const schema: ObjectSchemaDefinition<ObjectAssign<A, B>> = {
      type: 'object',
      entries: { ...a.schema.entries, ...b.schema.entries }
    };

    return new ObjectSchemaValidator(validatorEntries, schema);
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

export function object<T extends StringMap<SchemaDefinition>>(entries: ObjectSchemaValidatorEntries<T>, options?: SchemaOptions<ObjectSchemaDefinition<T>, 'entries'>): ObjectSchemaValidator<T> {
  const validatorEntries = Object.entries(entries) as [PropertyKey, SchemaValidator][];
  const mappedValidatorEntries = validatorEntries.map(([key, value]) => [key, value.schema] as const);

  const schema = schemaHelper<ObjectSchemaDefinition<T>>({
    type: 'object',
    entries: Object.fromEntries(mappedValidatorEntries) as T,
    ...options
  });

  return new ObjectSchemaValidator(entries, schema);
}

export function assign<A extends StringMap<SchemaDefinition>, B extends StringMap<SchemaDefinition>>(a: ObjectSchemaValidator<A>, b: ObjectSchemaValidator<B>): ObjectSchemaValidator<ObjectAssign<A, B>> {
  return ObjectSchemaValidator.assign(a, b);
}
