/* eslint-disable @typescript-eslint/naming-convention */

import type { Record, TypedOmit } from '#/types';
import type { PartialOnUndefinedDeep } from 'type-fest';
import type { ObjectSchema, ObjectSchemaProperties } from '../types';
import { objectSchema } from '../types';

export type ObjectOptions<T extends Record = Record> = TypedOmit<ObjectSchema<T>, 'properties'>;

export function explicitObject<T extends Record>(properties: ObjectSchemaProperties<T>, options?: ObjectOptions<T>): ObjectSchema<T> {
  return object(properties, options) as any as ObjectSchema<T>;
}

export function object<T extends Record>(properties: ObjectSchemaProperties<T>, options?: ObjectOptions<T>): ObjectSchema<PartialOnUndefinedDeep<T>, PartialOnUndefinedDeep<T>> {
  return objectSchema({
    properties,
    ...options
  }) as unknown as ObjectSchema<PartialOnUndefinedDeep<T>, PartialOnUndefinedDeep<T>>;
}
