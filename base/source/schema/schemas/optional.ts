import type { Schema } from '../schema';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function optional<T, O>(schema: Schema<T, O>): ValueSchema<T | undefined, O | undefined> {
  return valueSchema({ type: schema as ValueSchema<T | undefined, O | undefined>, optional: true });
}
