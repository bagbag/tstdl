/* eslint-disable @typescript-eslint/naming-convention */

import type { Record, SimplifiedOptionalize, TypedOmit } from '#/types';
import type { ObjectSchema, ObjectSchemaProperties } from '../types';
import { objectSchema } from '../types';

export type ObjectOptions<T extends Record = Record> = TypedOmit<ObjectSchema<T>, 'properties'>;

export function explicitObject<T extends Record>(properties: ObjectSchemaProperties<T>, options?: ObjectOptions<T>): ObjectSchema<T> {
  return object(properties, options) as any as ObjectSchema<T>;
}

export function object<T extends Record>(properties: ObjectSchemaProperties<T>, options?: ObjectOptions<T>): ObjectSchema<SimplifiedOptionalize<T>> {
  return objectSchema({
    properties,
    ...options
  }) as unknown as ObjectSchema<SimplifiedOptionalize<T>>;
}

export const emptyObjectSchema = explicitObject<{}>({});
