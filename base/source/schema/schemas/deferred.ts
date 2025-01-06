import type { JsonPath } from '#/json-path/json-path.js';
import { lazyProperty } from '#/utils/object/lazy-property.js';
import { PropertySchema, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaOutput, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';

export class DeferredSchema<T extends SchemaTestable> extends Schema<SchemaOutput<T>> {
  override readonly name: string;
  readonly testable: T;
  readonly schema: Schema<SchemaOutput<T>>;

  constructor(schema: () => T) {
    super();

    lazyProperty(this, 'schema', () => schemaTestableToSchema(schema()) as Schema<SchemaOutput<T>>);
    lazyProperty(this, 'name', () => `Deferred[${this.schema.name}]`);
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<SchemaOutput<T>> {
    return this.schema._test(value, path, options);
  }
}

export function deferred<T extends SchemaTestable>(schema: () => T): DeferredSchema<T> {
  return new DeferredSchema(schema);
}

export function Deferred(schema: () => SchemaTestable, options?: SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema(() => deferred(schema), options);
}
