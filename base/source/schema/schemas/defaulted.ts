import type { JsonPath } from '#/json-path/json-path.js';
import { isNullOrUndefined } from '#/utils/type-guards.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';

export class DefaultSchema<T, D> extends Schema<T | D> {
  override readonly name: string;
  readonly schema: Schema<T>;
  readonly defaultValue: D;

  constructor(schema: SchemaTestable<T>, defaultValue: D) {
    super();

    this.schema = schemaTestableToSchema(schema);
    this.defaultValue = defaultValue;
    this.name = `Defaulted[${this.schema.name}]`;
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T | D> {
    if (isNullOrUndefined(value)) {
      return { valid: true, value: this.defaultValue };
    }

    return this.schema._test(value, path, options);
  }
}

export function defaulted<T, D>(schema: SchemaTestable<T>, defaultValue: D): DefaultSchema<T, D> {
  return new DefaultSchema(schema, defaultValue);
}

export function Defaulted<T, D>(schema: SchemaTestable<T>, defaultValue: D, options?: SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(defaulted(schema, defaultValue), options);
}
