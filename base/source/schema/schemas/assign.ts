import type { Record } from '#/types';
import { toArray } from '#/utils/array/array';
import { assert } from '#/utils/type-guards';
import type { Merge } from 'type-fest';
import type { ObjectSchema } from '../types';


export function assign<A extends Record, B extends Record>(schema1: ObjectSchema<A>, schema2: ObjectSchema<B>):
  ObjectSchema<Merge<A, B>>;

export function assign<A extends Record, B extends Record, C extends Record>(schema1: ObjectSchema<A>, schema2: ObjectSchema<B>, schema3: ObjectSchema<C>):
  ObjectSchema<Merge<Merge<A, B>, C>>;

export function assign<A extends Record, B extends Record, C extends Record, D extends Record>(schema1: ObjectSchema<A>, schema2: ObjectSchema<B>, schema3: ObjectSchema<C>, schema4: ObjectSchema<D>):
  ObjectSchema<Merge<Merge<Merge<A, B>, C>, D>>;

export function assign<A extends Record, B extends Record, C extends Record, D extends Record, E extends Record>(schema1: ObjectSchema<A>, schema2: ObjectSchema<B>, schema3: ObjectSchema<C>, schema4: ObjectSchema<D>, schema5: ObjectSchema<E>):
  ObjectSchema<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>>;

export function assign<A extends Record, B extends Record, C extends Record, D extends Record, E extends Record, F extends Record>(schema1: ObjectSchema<A>, schema2: ObjectSchema<B>, schema3: ObjectSchema<C>, schema4: ObjectSchema<D>, schema5: ObjectSchema<E>, schema6: ObjectSchema<F>):
  ObjectSchema<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>>;

export function assign(...schemas: ObjectSchema[]): ObjectSchema {
  assert(schemas.length >= 2, 'Assign requires at least 2 schemas.');

  let result = schemas[0]!;
  const hasDeferredValueType = schemas.flatMap((schema) => toArray(schema.allowUnknownProperties));

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
