/* eslint-disable @typescript-eslint/naming-convention */

import type { OneOrMany } from '#/types';
import { DefaultValueCoercer } from '../coercers';
import type { SchemaTestable } from '../schema';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function defaulted<T, O, Default>(type: OneOrMany<SchemaTestable<T, O>>, defaultValue: Default): ValueSchema<T, O | Default> {
  return valueSchema(type, {
    coercers: new DefaultValueCoercer(defaultValue)
  });
}
