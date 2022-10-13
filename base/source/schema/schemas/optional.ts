import type { OneOrMany } from '#/types';
import type { SchemaTestable } from '../schema';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function optional<T, O>(schema: OneOrMany<SchemaTestable<T, O>>): ValueSchema<T | undefined, O | undefined> {
  return valueSchema(schema as SchemaTestable<T | undefined, O | undefined>, { optional: true });
}
