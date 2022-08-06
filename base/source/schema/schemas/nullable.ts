import type { Schema } from '../schema';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function nullable<T>(schema: Schema<T>): ValueSchema<T | null> {
  return valueSchema({ type: schema, nullable: true });
}
