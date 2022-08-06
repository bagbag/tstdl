import type { Schema } from '../schema';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function optional<T>(schema: Schema<T>): ValueSchema<T | undefined> {
  return valueSchema({ type: schema as Schema<T | undefined>, optional: true });
}
