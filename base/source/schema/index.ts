import type { Writable } from 'type-fest';
import { Schema, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from './schema.js';
import { schemaTestableToSchema } from './testable.js';

export * from './decorators/index.js';
export * from './schema.error.js';
export * from './schema.js';
export * from './schemas/index.js';
export * from './testable.js';

(Schema as Writable<typeof Schema>).test = function test<T>(schema: SchemaTestable<T>, value: any, options?: SchemaTestOptions): SchemaTestResult<T> {
  return schemaTestableToSchema(schema).test(value, options);
};

(Schema as Writable<typeof Schema>).validate = function validate<T>(schema: SchemaTestable<T>, value: any, options?: SchemaTestOptions): boolean {
  return schemaTestableToSchema(schema).validate(value, options);
};

(Schema as Writable<typeof Schema>).assert = function assert<T>(schema: SchemaTestable<T>, value: any, options?: SchemaTestOptions): asserts value is T {
  (schemaTestableToSchema(schema).assert as (...args: Parameters<Schema<T>['assert']>) => any)(value, options);
};

(Schema as Writable<typeof Schema>).parse = function parse<T>(schema: SchemaTestable<T>, value: any, options?: SchemaTestOptions): T {
  return schemaTestableToSchema(schema).parse(value, options);
};
