import type { JsonPath } from '#/json-path/json-path.js';
import { lazyProperty } from '#/utils/object/lazy-property.js';
import { isNullOrUndefined } from '#/utils/type-guards.js';
import { PropertySchema, type SchemaPropertyDecorator, type SchemaDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaOptions, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';

export type DefaultSchemaOptions<T, D> = SchemaOptions<T | D>;

export class DefaultSchema<T, D> extends Schema<T | D> {
  override readonly name: string;
  readonly schema: Schema<T>;
  readonly defaultValue: D;

  constructor(schema: SchemaTestable<T>, defaultValue: D, options?: DefaultSchemaOptions<T, D>) {
    super(options);

    this.schema = schemaTestableToSchema(schema);
    this.defaultValue = defaultValue;

    lazyProperty(this, 'name', () => `Defaulted[${this.schema.name}]`);
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T | D> {
    if (isNullOrUndefined(value)) {
      return { valid: true, value: this.defaultValue };
    }

    return this.schema._test(value, path, options);
  }
}

export function defaulted<T, D>(schema: SchemaTestable<T>, defaultValue: D, options?: DefaultSchemaOptions<T, D>): DefaultSchema<T, D> {
  return new DefaultSchema(schema, defaultValue, options);
}

export function Defaulted<T, D>(schema: SchemaTestable<T>, defaultValue: D, options?: DefaultSchemaOptions<T, D> & SchemaDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => defaulted(schema, defaultValue, { description: data.description, example: data.example, ...options }), options);
}
