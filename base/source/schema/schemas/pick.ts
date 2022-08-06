import type { OneOrMany, Record } from '#/types';
import { toArray } from '#/utils/array/array';
import type { Simplify } from 'type-fest';
import type { ObjectSchema } from '../types';
import { objectSchema } from '../types';

export function pick<T extends Record, K extends keyof T>(schema: ObjectSchema<T>, key: OneOrMany<K>): ObjectSchema<Simplify<Pick<T, K>>> {
  const keys = toArray(key);

  const entries = Object.entries(schema.properties);
  const pickedEntries = entries.filter(([propertyKey]) => keys.includes(propertyKey as K));

  const pickedSchema = objectSchema({
    ...schema,
    properties: Object.fromEntries(pickedEntries) as Pick<T, K>
  });

  return pickedSchema as ObjectSchema<Pick<T, K>>;
}
