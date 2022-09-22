import type { SchemaTestable } from '../schema';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function nullable<T, O>(schema: SchemaTestable<T, O>): ValueSchema<T | null, O | null> {
  return valueSchema(schema, { nullable: true }) as ValueSchema<T | null, O | null>;
}
