import type { JsonPath } from '#/json-path/json-path.js';
import type { TypedOmit } from '#/types.js';
import { lazyProperty } from '#/utils/object/lazy-property.js';
import { isUndefined } from '#/utils/type-guards.js';
import { createSchemaPropertyDecorator, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { type OPTIONAL, Schema, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';

export class OptionalSchema<T> extends Schema<T | undefined> {
  override readonly name: string;

  declare readonly [OPTIONAL]: true;

  readonly schema: Schema<T>;

  constructor(schema: SchemaTestable<T>) {
    if ((schema instanceof OptionalSchema) && (schema == schema.schema)) {
      return schema; // eslint-disable-line no-constructor-return
    }

    super();

    this.schema = schemaTestableToSchema(schema);

    lazyProperty(this, 'name', () => `Optional[${this.schema.name}]`);
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T | undefined> {
    if (isUndefined(value)) {
      return { valid: true, value: undefined };
    }

    return this.schema._test(value, path, options);
  }
}

export function optional<T>(schema: SchemaTestable<T>): OptionalSchema<T> {
  return new OptionalSchema(schema);
}

export function Optional(schema?: SchemaTestable, options?: TypedOmit<SchemaPropertyDecoratorOptions, 'optional'>): SchemaPropertyDecorator {
  return createSchemaPropertyDecorator({ schema, ...options, optional: true });
}
