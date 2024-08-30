import type { JsonPath } from '#/json-path/json-path.js';
import type { TypedOmit } from '#/types.js';
import { isNull } from '#/utils/type-guards.js';
import { createSchemaPropertyDecorator, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';

export class NullableSchema<T> extends Schema<T | null> {
  override readonly name: string;
  readonly schema: Schema<T>;

  constructor(schema: SchemaTestable<T>) {
    if ((schema instanceof NullableSchema) && (schema == schema.schema)) {
      return schema; // eslint-disable-line no-constructor-return
    }

    super();

    this.schema = schemaTestableToSchema(schema);
    this.name = `Nullable[${this.schema.name}]`;
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T | null> {
    if (isNull(value)) {
      return { valid: true, value };
    }

    return this.schema._test(value, path, options);
  }
}

export function nullable<T>(schema: SchemaTestable<T>): NullableSchema<T> {
  return new NullableSchema(schema);
}

export function Nullable(schema?: SchemaTestable, options?: TypedOmit<SchemaPropertyDecoratorOptions, 'nullable'>): SchemaPropertyDecorator {
  return createSchemaPropertyDecorator({ schema, ...options, nullable: true });
}
