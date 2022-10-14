/* eslint-disable @typescript-eslint/naming-convention */

import type { OneOrMany } from '#/types';
import type { SchemaTestable } from '../schema';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';
import { transform } from './transform';

export function defaulted<T, Default>(type: OneOrMany<SchemaTestable<T>>, defaultValue: Default): ValueSchema<NonNullable<T> | Default> {
  return transform(valueSchema(type, { optional: true, nullable: true }), (value: T) => value ?? defaultValue); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
}
