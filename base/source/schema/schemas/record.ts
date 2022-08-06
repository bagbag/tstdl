/* eslint-disable @typescript-eslint/naming-convention */

import type { Record, TypedOmit } from '#/types';
import type { MaybeDeferredValueTypes, ObjectSchema } from '../types';
import { objectSchema } from '../types';

export type RecordOptions<T extends Record = Record> = TypedOmit<ObjectSchema<T>, 'properties' | 'allowUnknownProperties'>;

export function record<T extends MaybeDeferredValueTypes>(schemas: T, options?: RecordOptions): ObjectSchema<Record<any, T extends MaybeDeferredValueTypes<infer U> ? U : never>> {
  return objectSchema({
    properties: {},
    allowUnknownProperties: schemas,
    ...options
  }) as ObjectSchema;
}
