/* eslint-disable @typescript-eslint/ban-types */

import type { ValueSchema, ValueType } from '../types';
import { valueSchema } from '../types';

export function instance<T>(type: Extract<ValueType<T>, Function>): ValueSchema<T> {
  return valueSchema<T>({ type });
}
