import type { JsonPath } from '#/json-path/json-path.js';
import type { OneOrMany as OneOrManyType } from '#/types.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';
import { array } from './array.js';
import { union } from './union.js';

export type OneOrMany<T> = OneOrManyType<T>;

export class OneOrManySchema<T> extends Schema<T | T[]> {
  readonly schema: Schema<T | T[]>;

  constructor(schema: SchemaTestable<T>) {
    super();

    const oneSchema = schemaTestableToSchema(schema);

    this.schema = union(oneSchema, array(oneSchema));
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T | T[]> {
    return this.schema._test(value, path, options);
  }
}

export function oneOrMany<T>(schema: SchemaTestable<T>): OneOrManySchema<T> {
  return new OneOrManySchema(schema);
}

export function OneOrMany(schema: SchemaTestable, options?: SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(oneOrMany(schema), options);
}
