/* eslint-disable @typescript-eslint/ban-types */

import type { NormalizeValueType, TypeSchema, ValueType } from '../types';
import { typeSchema } from '../types';

export function instance<T>(type: ValueType<T>): TypeSchema<NormalizeValueType<T>> {
  return typeSchema<T>(type);
}
