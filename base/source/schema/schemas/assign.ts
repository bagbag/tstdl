import { toArray } from '#/utils/array/array';
import { assert } from '#/utils/type-guards';
import type { Merge } from 'type-fest';
import type { ObjectSchema, ObjectSchemaOrType } from '../types';
import { getObjectSchema } from '../utils';

export function assign<T1, T2>(schema1: ObjectSchemaOrType<T1>, schema2: ObjectSchemaOrType<T2>): ObjectSchema<Merge<T1, T2>>;
export function assign<T1, T2, T3>(schema1: ObjectSchemaOrType<T1>, schema2: ObjectSchemaOrType<T2>, schema3: ObjectSchemaOrType<T3>): ObjectSchema<Merge<Merge<T1, T2>, T3>>;
export function assign<T1, T2, T3, T4>(schema1: ObjectSchemaOrType<T1>, schema2: ObjectSchemaOrType<T2>, schema3: ObjectSchemaOrType<T3>, schema4: ObjectSchemaOrType<T4>): ObjectSchema<Merge<Merge<T1, T2>, Merge<T3, T4>>>;
export function assign<T1, T2, T3, T4, T5>(schema1: ObjectSchemaOrType<T1>, schema2: ObjectSchemaOrType<T2>, schema3: ObjectSchemaOrType<T3>, schema4: ObjectSchemaOrType<T4>, schema5: ObjectSchemaOrType<T5>): ObjectSchema<Merge<Merge<Merge<T1, T2>, Merge<T3, T4>>, T5>>;
export function assign<T1, T2, T3, T4, T5, T6>(schema1: ObjectSchemaOrType<T1>, schema2: ObjectSchemaOrType<T2>, schema3: ObjectSchemaOrType<T3>, schema4: ObjectSchemaOrType<T4>, schema5: ObjectSchemaOrType<T5>, schema6: ObjectSchemaOrType<T6>): ObjectSchema<Merge<Merge<Merge<T1, T2>, Merge<T3, T4>>, Merge<T5, T6>>>;
export function assign(...inputs: ObjectSchemaOrType[]): ObjectSchema {
  const schemas = inputs.map(getObjectSchema);
  assert(schemas.length >= 2, 'Assign requires at least 2 schemas.');

  let result = schemas[0]!;

  for (let i = 1; i < schemas.length; i++) {
    result = {
      ...result,
      ...schemas[i]!,
      properties: {
        ...result.properties,
        ...schemas[i]!.properties
      },
      allowUnknownProperties: [...toArray(result.allowUnknownProperties ?? []), ...toArray(schemas[i]!.allowUnknownProperties ?? [])]
    };
  }

  if ((result.allowUnknownProperties as any[]).length == 0) {
    const { allowUnknownProperties: _, ...rest } = result;
    result = rest;
  }

  return result;
}
