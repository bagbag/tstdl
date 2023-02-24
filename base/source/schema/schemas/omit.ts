import type { ObjectLiteral, OneOrMany } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { objectEntries } from '#/utils/object/object.js';
import type { Simplify } from 'type-fest';
import type { ObjectSchema, ObjectSchemaOrType, ObjectSchemaProperties } from '../types/index.js';
import { objectSchema } from '../types/index.js';
import { getObjectSchema } from '../utils/schema.js';

export function omit<T extends ObjectLiteral, K extends keyof T>(schemaOrType: ObjectSchemaOrType<T>, keys: OneOrMany<K>): ObjectSchema<Simplify<Omit<T, K>>> {
  const schema = getObjectSchema(schemaOrType);
  const keyArray = toArray(keys);

  const entries = objectEntries(schema.properties);
  const pickedEntries = entries.filter(([propertyKey]) => !keyArray.includes(propertyKey as K));

  const pickedSchema = objectSchema({
    ...schema,
    properties: Object.fromEntries(pickedEntries) as ObjectSchemaProperties<T>
  });

  return pickedSchema as unknown as ObjectSchema<Omit<T, K>>;
}
