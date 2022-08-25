import type { OneOrMany, Record } from '#/types';
import { toArray } from '#/utils/array/array';
import type { Simplify } from 'type-fest';
import type { ObjectSchema, ObjectSchemaProperties } from '../types';
import { objectSchema } from '../types';

export function omit<T extends Record, K extends keyof T>(schema: ObjectSchema<T>, keys: OneOrMany<K>): ObjectSchema<Simplify<Omit<T, K>>> {
  const keyArray = toArray(keys);

  const entries = Object.entries(schema.properties);
  const pickedEntries = entries.filter(([propertyKey]) => !keyArray.includes(propertyKey as K));

  const pickedSchema = objectSchema({
    ...schema,
    properties: Object.fromEntries(pickedEntries) as ObjectSchemaProperties<T>
  });

  return pickedSchema as unknown as ObjectSchema<Omit<T, K>>;
}
