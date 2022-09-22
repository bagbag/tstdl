/* eslint-disable @typescript-eslint/naming-convention */

import type { OneOrMany, Record, TypedOmit } from '#/types';
import type { SchemaTestable } from '../schema';
import type { ObjectSchema } from '../types';
import { objectSchema } from '../types';

export type RecordOptions<T extends Record = Record> = TypedOmit<ObjectSchema<T>, 'properties' | 'allowUnknownProperties' | 'mask'>;

export function record<T, O>(valueType: OneOrMany<SchemaTestable<T, O>>, options?: RecordOptions): ObjectSchema<Record<any, O>> {
  return objectSchema({
    properties: {},
    allowUnknownProperties: valueType,
    ...options
  }) as ObjectSchema;
}
