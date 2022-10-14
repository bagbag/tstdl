import type { OneOrMany } from '#/types';
import type { SchemaTestable } from '../schema';
import type { NormalizeValueType, ValueSchema, ValueSchemaOptions } from '../types';
import { valueSchema } from '../types';

export type OptionalOptions = ValueSchemaOptions;

export function optional<T>(schema: OneOrMany<SchemaTestable<T>>, options?: OptionalOptions): ValueSchema<NormalizeValueType<T> | undefined> {
  return valueSchema(schema as SchemaTestable<NormalizeValueType<T> | undefined>, { ...options, optional: true });
}
