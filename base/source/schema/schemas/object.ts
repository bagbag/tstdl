/* eslint-disable @typescript-eslint/naming-convention */

import type { Record, SimplifiedOptionalize, TypedOmit } from '#/types.js';
import type { ObjectSchema, ObjectSchemaProperties } from '../types/index.js';
import { objectSchema } from '../types/index.js';

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
