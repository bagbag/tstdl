import type { Decorator } from '#/reflection/index.js';
import type { OneOrMany } from '#/types.js';
import { createSchemaPropertyDecorator } from '../decorators/utils.js';
import type { SchemaTestable } from '../schema.js';
import { valueSchema } from '../types/index.js';
import type { ValueSchema, ValueSchemaOptions } from '../types/types.js';

export type OptionalOptions = ValueSchemaOptions;

export function optional<T>(schema: OneOrMany<SchemaTestable<T>>, options?: OptionalOptions): ValueSchema<T | undefined> {
  return valueSchema(schema as SchemaTestable<T | undefined>, { ...options, optional: true });
}

export function Optional(schema?: OneOrMany<SchemaTestable>): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ schema, optional: true });
}
