import type { OneOrMany, PartialProperty, Record } from '#/types';
import { toArray } from '#/utils/array/array';
import { mapObjectValues } from '#/utils/object';
import { isDefined, isUndefined } from '#/utils/type-guards';
import type { ObjectSchema, ObjectSchemaOrType, ObjectSchemaProperties } from '../types';
import { objectSchema } from '../types';
import { getObjectSchema } from '../utils';
import { optional } from './optional';

export function partial<T extends Record>(schema: ObjectSchemaOrType<T>): ObjectSchema<Partial<T>>;
export function partial<T extends Record, K extends keyof T>(schema: ObjectSchemaOrType<T>, keys: OneOrMany<K>): ObjectSchema<PartialProperty<T, K>>;
export function partial<T extends Record, K extends keyof T>(schemaOrType: ObjectSchemaOrType<T>, keys?: OneOrMany<K>): ObjectSchema<Partial<T>> {
  const schema = getObjectSchema(schemaOrType);

  const keyArray = isDefined(keys) ? toArray(keys) : undefined;
  const makeAllOptional = isUndefined(keyArray);

  const partialEntries = mapObjectValues(schema.properties, (propertySchema, key) => ((makeAllOptional || keyArray.includes(key as K)) ? optional(propertySchema) : propertySchema)) as ObjectSchemaProperties<T>;

  const pickedSchema = objectSchema({
    ...schema,
    properties: partialEntries
  });

  return pickedSchema as unknown as ObjectSchema<Partial<T>>;
}
