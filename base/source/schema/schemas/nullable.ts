import type { Decorator } from '#/reflection/index.js';
import { createSchemaPropertyDecorator } from '../decorators/utils.js';
import type { SchemaTestable } from '../schema.js';
import type { ValueSchema, ValueSchemaOptions } from '../types/index.js';
import { valueSchema } from '../types/index.js';

export type NullableOptions = ValueSchemaOptions;

export function nullable<T>(schema: SchemaTestable<T>, options?: NullableOptions): ValueSchema<T | null> {
  return valueSchema(schema, { ...options, nullable: true }) as ValueSchema<T | null>;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Nullable(options?: NullableOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ ...options, nullable: true });
}
