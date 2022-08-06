/* eslint-disable @typescript-eslint/naming-convention */

import { DefaultValueCoercer } from '../coercers';
import type { MaybeDeferredValueTypes, ValueSchema } from '../types';
import { valueSchema } from '../types';

export function defaulted<T>(type: MaybeDeferredValueTypes, defaultValue: T): ValueSchema<Date | T> {
  return valueSchema({
    type,
    coercers: new DefaultValueCoercer(defaultValue)
  });
}
