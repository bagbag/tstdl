/* eslint-disable @typescript-eslint/ban-types */

import type { ValueSchema, ValueSchemaOptions, ValueType } from '../types';
import { valueSchema } from '../types';

export type InstanceOptions = ValueSchemaOptions;

export function instance<T>(type: ValueType<T>, options?: InstanceOptions): ValueSchema<T> {
  return valueSchema(type, options);
}
