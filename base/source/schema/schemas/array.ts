import type { JsonPath } from '#/json-path/json-path.js';
import { SchemaError } from '#/schema/schema.error.js';
import type { TypedOmit } from '#/types.js';
import { isArray } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';

export class ArraySchema<T> extends Schema<T[]> {
  readonly itemSchema: Schema<T>;

  constructor(itemSchema: SchemaTestable<T>) {
    super();

    this.itemSchema = schemaTestableToSchema(itemSchema);
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T[]> {
    if (!isArray(value)) {
      return { valid: false, error: SchemaError.expectedButGot('array', typeOf(value), path) };
    }

    const values: T[] = [];

    for (let i = 0; i < value.length; i++) {
      const result = this.itemSchema._test(value[i], path.add(i), options);

      if (!result.valid) {
        return result;
      }

      values.push(result.value);
    }

    return { valid: true, value: values };
  }
}

export function array<T>(schema: SchemaTestable<T>): ArraySchema<T> {
  return new ArraySchema(schema);
}

export function Array(schema: SchemaTestable, options?: TypedOmit<SchemaPropertyDecoratorOptions, 'array'>): SchemaPropertyDecorator {
  return Property(schema, { ...options, array: true });
}
