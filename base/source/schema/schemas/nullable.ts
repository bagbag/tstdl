import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecorator } from '../decorators/utils';
import type { SchemaTestable } from '../schema';
import type { ValueSchema, ValueSchemaOptions } from '../types';
import { valueSchema } from '../types';

export type NullableOptions = ValueSchemaOptions;

export function nullable<T>(schema: SchemaTestable<T>, options?: NullableOptions): ValueSchema<T | null> {
  return valueSchema(schema, { ...options, nullable: true }) as ValueSchema<T | null>;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Nullable(options?: NullableOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ ...options, nullable: true });
}
