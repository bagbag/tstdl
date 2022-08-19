import type { ValueSchema, ValueType } from '../types';
import { valueSchema } from '../types';

export function nullable<T, O>(schema: ValueType<T, O>): ValueSchema<T, O | null> {
  return valueSchema(schema, { nullable: true });
}
