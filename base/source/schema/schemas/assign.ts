import type { Record } from '#/types';
import { toArray } from '#/utils/array/array';
import { assert } from '#/utils/type-guards';
import type { Merge } from 'type-fest';
import type { ObjectSchema } from '../types';

export function assign<T1, O1, T2, O2>(schema1: ObjectSchema<T1, O1>, schema2: ObjectSchema<T2, O2>): ObjectSchema<Merge<T1, T2>, Merge<O1, O2>>;
export function assign<T1, O1, T2, O2, T3, O3>(schema1: ObjectSchema<T1, O1>, schema2: ObjectSchema<T2, O2>, schema3: ObjectSchema<T3, O3>): ObjectSchema<Merge<Merge<T1, T2>, T3>, Merge<Merge<O1, O2>, O3>>;
export function assign<T1, O1, T2, O2, T3, O3, T4, O4>(schema1: ObjectSchema<T1, O1>, schema2: ObjectSchema<T2, O2>, schema3: ObjectSchema<T3, O3>, schema4: ObjectSchema<T4, O4>): ObjectSchema<Merge<Merge<Merge<T1, T2>, T3>, T4>, Merge<Merge<Merge<O1, O2>, O3>, O4>>;
export function assign<T1, O1, T2, O2, T3, O3, T4, O4, T5, O5>(schema1: ObjectSchema<T1, O1>, schema2: ObjectSchema<T2, O2>, schema3: ObjectSchema<T3, O3>, schema4: ObjectSchema<T4, O4>, schema5: ObjectSchema<T5, O5>): ObjectSchema<Merge<Merge<Merge<Merge<T1, T2>, T3>, T4>, T5>, Merge<Merge<Merge<Merge<O1, O2>, O3>, O4>, O5>>;
export function assign<T1, O1, T2, O2, T3, O3, T4, O4, T5, O5, T6 extends Record, O6 extends Record>(schema1: ObjectSchema<T1, O1>, schema2: ObjectSchema<T2, O2>, schema3: ObjectSchema<T3, O3>, schema4: ObjectSchema<T4, O4>, schema5: ObjectSchema<T5, O5>, schema6: ObjectSchema<T6, O6>): ObjectSchema<Merge<Merge<Merge<Merge<Merge<T1, T2>, T3>, T4>, T5>, T6>, Merge<Merge<Merge<Merge<Merge<O1, O2>, O3>, O4>, O5>, O6>>;
export function assign(...schemas: ObjectSchema[]): ObjectSchema {
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
