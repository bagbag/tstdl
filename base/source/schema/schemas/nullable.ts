import type { SchemaTestable } from '../schema';
import type { NormalizeValueType, ValueSchema, ValueSchemaOptions } from '../types';
import { valueSchema } from '../types';

export type NullableOptions = ValueSchemaOptions;

export function nullable<T>(schema: SchemaTestable<T>, options?: NullableOptions): ValueSchema<NormalizeValueType<T> | null> {
  return valueSchema(schema, { ...options, nullable: true }) as ValueSchema<NormalizeValueType<T> | null>;
}
