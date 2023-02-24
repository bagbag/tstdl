import type { OneOrMany, Record } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { objectEntries } from '#/utils/object/object.js';
import type { Simplify } from 'type-fest';
import type { ObjectSchema, ObjectSchemaOrType, ObjectSchemaProperties } from '../types/index.js';
import { objectSchema } from '../types/index.js';
import { getObjectSchema } from '../utils/schema.js';

export function pick<T extends Record, K extends keyof T>(schemaOrType: ObjectSchemaOrType<T>, key: OneOrMany<K>): ObjectSchema<Simplify<Pick<T, K>>> {
  const schema = getObjectSchema(schemaOrType);
  const keys = toArray(key);

  const entries = objectEntries(schema.properties);
  const pickedEntries = entries.filter(([propertyKey]) => keys.includes(propertyKey as K));

  const pickedSchema = objectSchema({
    ...schema,
    properties: Object.fromEntries(pickedEntries) as ObjectSchemaProperties<T>
  });

  return pickedSchema as unknown as ObjectSchema<Pick<T, K>>;
}
