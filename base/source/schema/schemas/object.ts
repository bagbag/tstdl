/* eslint-disable @typescript-eslint/naming-convention */

import type { ObjectLiteral, Optionalize, Record, SimplifyObject, TypedOmit } from '#/types.js';
import type { IfNever } from 'type-fest';
import { objectSchema, type ObjectSchema, type ObjectSchemaProperties, type TypedObjectSchemaUnknownProperties } from '../types/index.js';

export type ObjectOptions<T extends Record = Record> = TypedOmit<ObjectSchema<T>, 'properties' | 'unknownProperties' | 'unknownPropertiesKey'>;

export function explicitObject<T extends Record>(properties: ObjectSchemaProperties<T>, options?: ObjectOptions<T>): ObjectSchema<T> {
  return object(properties, options) as any as ObjectSchema<T>;
}

export function object<T extends Record = Record<never>, K extends PropertyKey = any, V = never>(properties: ObjectSchemaProperties<T>, options?: ObjectOptions<T> & TypedObjectSchemaUnknownProperties<K, V>): ObjectSchema<SimplifyObject<Optionalize<T> & IfNever<V, ObjectLiteral, Record<K, V>>>> {
  return objectSchema<any>({
    properties,
    ...options
  });
}

export const emptyObjectSchema = explicitObject<ObjectLiteral>({});
