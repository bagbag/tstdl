/* eslint-disable @typescript-eslint/ban-types */

import type { NormalizeValueType_FOO, TypeSchema, ValueType_FOO } from '../types';
import { typeSchema } from '../types';

export function instance<T>(type: ValueType_FOO<T>): TypeSchema<NormalizeValueType_FOO<T>> {
  return typeSchema<T>(type);
}
