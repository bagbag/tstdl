/* eslint-disable @typescript-eslint/naming-convention */

import type { AbstractConstructor } from '#/types.js';
import { isDefined, isFunction, isNullOrUndefined, isUndefined } from '#/utils/type-guards.js';
import type { SchemaTestable } from '../schema.js';
import { array } from '../schemas/array.js';
import { nullable } from '../schemas/nullable.js';
import { optional } from '../schemas/optional.js';
import { schemaTestableToSchema } from '../testable.js';
import type { SchemaReflectionData } from './types.js';

export function schemaReflectionDataToSchema(reflectionData: SchemaReflectionData | undefined, fallbackType: AbstractConstructor | null, source: { type: AbstractConstructor, key: string | symbol }): SchemaTestable {
  if (isUndefined(reflectionData?.schema) && (fallbackType == Object)) {
    throw new Error(`Schema of property "${String(source.key)}" on type ${source.type.name} is inferred as Object. This is most likely unwanted and happens if the property is defined as partial or the type is an union. Use an explicit @Property(Object) if this is wanted.`);
  }

  let propertySchema = isDefined(reflectionData?.schema) ? reflectionData.schema(reflectionData) : fallbackType;

  if (isNullOrUndefined(propertySchema)) {
    throw new Error(`Could not infer schema for property "${String(source.key)}" on type ${source.type.name}. This happens if neither explicit @Property(type) is used nor reflection metadata is available.`);
  }

  if (isFunction(propertySchema)) {
    propertySchema = schemaTestableToSchema(propertySchema, { description: reflectionData?.description, example: reflectionData?.example });
  }

  if (reflectionData?.array == true) {
    propertySchema = array(propertySchema);
  }

  if (reflectionData?.nullable == true) {
    propertySchema = nullable(propertySchema);
  }

  if (reflectionData?.optional == true) {
    propertySchema = optional(propertySchema);
  }

  return propertySchema;
}
