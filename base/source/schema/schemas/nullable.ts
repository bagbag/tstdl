import type { Schema } from '../schema';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function nullable<T, O>(schema: Schema<T, O>): ValueSchema<T | null, O | null> {
  return valueSchema(schema, { nullable: true }) as ValueSchema<T | null, O | null>;
}
