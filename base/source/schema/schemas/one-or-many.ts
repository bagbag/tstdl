import type { JsonPath } from '#/json-path/json-path.js';
import type { OneOrMany as OneOrManyType } from '#/types.js';
import { lazyProperty } from '#/utils/object/lazy-property.js';
import { PropertySchema, type SchemaDecoratorOptions, type SchemaPropertyDecorator } from '../decorators/index.js';
import { Schema, type SchemaOptions, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';
import { array, type ArraySchemaOptions } from './array.js';
import { union } from './union.js';

export type OneOrManySchemaOptions<T> = SchemaOptions<T | T[]> & Pick<ArraySchemaOptions<T>, 'minimum' | 'maximum'>;

export type OneOrMany<T> = OneOrManyType<T>;

export class OneOrManySchema<T> extends Schema<T | T[]> {
  override readonly name: string;
  readonly schema: Schema<T | T[]>;

  constructor(schema: SchemaTestable<T>, options?: OneOrManySchemaOptions<T>) {
    super(options);

    const oneSchema = schemaTestableToSchema(schema);

    this.schema = union(oneSchema, array(oneSchema, { minimum: options?.minimum, maximum: options?.maximum }));

    lazyProperty(this, 'name', () => `OneOrMany[${oneSchema.name}]`);
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T | T[]> {
    return this.schema._test(value, path, options);
  }
}

export function oneOrMany<T>(schema: SchemaTestable<T>, options?: OneOrManySchemaOptions<T>): OneOrManySchema<T> {
  return new OneOrManySchema(schema, options);
}

export function OneOrMany<T>(schema: SchemaTestable<T>, options?: OneOrManySchemaOptions<T> & SchemaDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => oneOrMany(schema as SchemaTestable, { description: data.description, example: data.example, ...options }), options);
}
