/* eslint-disable @typescript-eslint/naming-convention */

import type { OneOrMany, Record, TypedOmit } from '#/types.js';
import type { SchemaTestable } from '../schema.js';
import type { ObjectSchema } from '../types/index.js';
import { objectSchema } from '../types/index.js';

export type RecordOptions<T extends Record = Record> = TypedOmit<ObjectSchema<T>, 'properties' | 'unknownProperties' | 'unknownPropertiesKey' | 'mask'>;

export function record<K extends PropertyKey, T>(keySchema: OneOrMany<SchemaTestable<K>>, valueSchema: OneOrMany<SchemaTestable<T>>, options?: RecordOptions): ObjectSchema<Record<K, T>> {
  return objectSchema({
    properties: {},
    unknownProperties: valueSchema,
    unknownPropertiesKey: keySchema,
    ...options
  });
}
