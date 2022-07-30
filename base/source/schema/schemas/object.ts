import type { JsonPath } from '#/json-path';
import type { OneOrMany, Optionalize, Record, SimplifyObject, StringMap } from '#/types';
import { toArray } from '#/utils/array/array';
import { differenceMaps } from '#/utils/map';
import { objectEntries } from '#/utils/object/object';
import { isBoolean } from '#/utils/type-guards';
import type { Simplify } from 'type-fest';
import { schemaError, SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test, testAsync } from '../schema.validator';
import type { Maskable, SchemaDefinition, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type ObjectOutputType<T extends StringMap<SchemaDefinition>> = Simplify<Optionalize<{ [P in keyof T]: SchemaOutput<T[P]> }>>;

export type ObjectSchemaValidatorEntries<T extends StringMap<SchemaDefinition>> = { [P in keyof T]: SchemaValidator<T[P]> };

export type ObjectSchemaDefinition<T extends StringMap<SchemaDefinition> = StringMap<SchemaDefinition>> = SchemaDefinition<'object', unknown, ObjectOutputType<T>> & Maskable & {
  entries: T,

  /** Keep unknown properties instead of raising an error. This overwrites mask. */
  keepUnknown?: boolean
};

export type ObjectAssign<A extends StringMap<SchemaDefinition>, B extends StringMap<SchemaDefinition>> = SimplifyObject<B & Omit<A, keyof B>>;
export type ObjectPick<T extends StringMap<SchemaDefinition>, K extends keyof T> = SimplifyObject<Pick<T, K>>;
export type ObjectExclude<T extends StringMap<SchemaDefinition>, K extends keyof T> = SimplifyObject<Omit<T, K>>;

export class ObjectSchemaValidator<T extends StringMap<SchemaDefinition>> extends SchemaValidator<ObjectSchemaDefinition<T>> {
  private readonly validatorEntries: Map<PropertyKey, SchemaValidator>;

  constructor(validators: ObjectSchemaValidatorEntries<T>, schema: ObjectSchemaDefinition<T>) {
    super(schema);

    this.validatorEntries = new Map(objectEntries(validators));
  }

  static assign<A extends StringMap<SchemaDefinition>, B extends StringMap<SchemaDefinition>>(a: ObjectSchemaValidator<A>, b: ObjectSchemaValidator<B>): ObjectSchemaValidator<ObjectAssign<A, B>> {
    const validatorEntries = Object.fromEntries([...a.validatorEntries, ...b.validatorEntries]) as ObjectSchemaValidatorEntries<A & B>;

    const schema: ObjectSchemaDefinition<ObjectAssign<A, B>> = {
      type: 'object',
      entries: { ...a.schema.entries, ...b.schema.entries }
    };

    return new ObjectSchemaValidator(validatorEntries, schema);
  }

  static pick<T extends StringMap<SchemaDefinition>, K extends keyof T>(objectSchema: ObjectSchemaValidator<T>, keys: OneOrMany<K>): ObjectSchemaValidator<ObjectPick<T, K>> {
    const keysArray = toArray(keys);
    const validatorEntries = Object.fromEntries([...objectSchema.validatorEntries].filter(([key]) => keysArray.includes(key as K))) as ObjectSchemaValidatorEntries<ObjectPick<T, K>>;

    const schema: ObjectSchemaDefinition<Pick<T, K>> = {
      type: 'object',
      entries: Object.fromEntries([...Object.entries(objectSchema.schema.entries)].filter(([key]) => keysArray.includes(key as K))) as Pick<T, K>
    };

    return new ObjectSchemaValidator(validatorEntries, schema);
  }

  static exclude<T extends StringMap<SchemaDefinition>, K extends keyof T>(objectSchema: ObjectSchemaValidator<T>, keys: OneOrMany<K>): ObjectSchemaValidator<ObjectExclude<T, K>> {
    const keysArray = toArray(keys);
    const validatorEntries = Object.fromEntries([...objectSchema.validatorEntries].filter(([key]) => !keysArray.includes(key as K))) as ObjectSchemaValidatorEntries<ObjectExclude<T, K>>;

    const schema: ObjectSchemaDefinition<Omit<T, K>> = {
      type: 'object',
      entries: Object.fromEntries([...Object.entries(objectSchema.schema.entries)].filter(([key]) => !keysArray.includes(key as K))) as Omit<T, K>
    };

    return new ObjectSchemaValidator(validatorEntries, schema);
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<ObjectOutputType<T>> {
    const testBaseResult = this._testBase(value, options, path);

    if (!testBaseResult.valid) {
      return testBaseResult;
    }

    let resultObject: Record = {};

    for (const [key, validator] of this.validatorEntries) {
      const innerValue = testBaseResult.value.get(key as string);

      const innerValueValidationTestResult = validator[test](innerValue, options, path.add(key as string));

      if (!innerValueValidationTestResult.valid) {
        return innerValueValidationTestResult;
      }

      resultObject[key as string] = innerValueValidationTestResult.value;
    }

    if (this.schema.keepUnknown == true) {
      resultObject = { ...(value as object), ...resultObject };
    }

    return { valid: true, value: resultObject as ObjectOutputType<T> };
  }

  async [testAsync](value: unknown, options: DefinedValidationOptions, path: JsonPath): Promise<ValidationTestResult<ObjectOutputType<T>>> {
    const testBaseResult = this._testBase(value, options, path);

    if (!testBaseResult.valid) {
      return testBaseResult;
    }

    let resultObject: Record = {};

    for (const [key, validator] of this.validatorEntries) {
      const innerValue = testBaseResult.value.get(key as string);

      const innerValueValidationTestResult = await validator[testAsync](innerValue, options, path.add(key as string));

      if (!innerValueValidationTestResult.valid) {
        return innerValueValidationTestResult;
      }

      resultObject[key as string] = innerValueValidationTestResult.value;
    }

    if (this.schema.keepUnknown == true) {
      resultObject = { ...(value as object), ...resultObject };
    }

    return { valid: true, value: resultObject as ObjectOutputType<T> };
  }

  private _testBase(value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<Map<PropertyKey, any>> {
    const typeResult = this.ensureType('object', value, path);

    if (!typeResult.valid) {
      return typeResult;
    }
    else if (value === null) {
      return { valid: false, error: SchemaError.expectedButGot('object', 'null', path) };
    }

    const valueEntries = new Map(objectEntries(value as Record));
    const unknownKeys = differenceMaps(valueEntries, this.validatorEntries);

    if ((unknownKeys.length > 0) && (this.schema.mask != true) && (isBoolean(this.schema.mask) || !options.mask) && (this.schema.keepUnknown != true)) {
      const keys = unknownKeys.map((entry) => entry[0]).join(', ');
      return { valid: false, error: schemaError(`unexpected keys in object: ${keys}`, path) };
    }

    return { valid: true, value: valueEntries };
  }
}

export function object<T extends StringMap<SchemaDefinition>>(entries: ObjectSchemaValidatorEntries<T>, options?: SchemaOptions<ObjectSchemaDefinition<T>, 'entries'>): ObjectSchemaValidator<T> {
  const validatorEntries = objectEntries(entries) as [PropertyKey, SchemaValidator][];
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

export function pick<T extends StringMap<SchemaDefinition>, K extends keyof T>(objectSchema: ObjectSchemaValidator<T>, keys: OneOrMany<K>): ObjectSchemaValidator<ObjectPick<T, K>> {
  return ObjectSchemaValidator.pick(objectSchema, keys);
}

export function exclude<T extends StringMap<SchemaDefinition>, K extends keyof T>(objectSchema: ObjectSchemaValidator<T>, keys: OneOrMany<K>): ObjectSchemaValidator<ObjectExclude<T, K>> {
  return ObjectSchemaValidator.exclude(objectSchema, keys);
}
