import { NotSupportedError } from '#/error/not-supported.error';
import { reflectionRegistry } from '#/reflection';
import type { ResolvedValueType } from '#/schema';
import { getSchemaFromReflection, getSchemaValueTypes, isValueSchema } from '#/schema';
import type { OneOrMany, Record, Type } from '#/types';
import { toArray } from '#/utils/array';
import { isNotNull } from '#/utils/type-guards';

export type EntityDefinition = {
  name: string,
  tableName?: string,
  properties: Record,
  indexes?: IndexDefinition[]
};

export type EntityPropertyType = 'any' | 'string' | 'number' | 'boolean';

export type PropertyDefinition = {
  type: OneOrMany<EntityPropertyType>,
  array?: boolean,
  optional?: boolean,
  nullable?: boolean,
  unique?: boolean
};

export type IndexDefinition = {
  properties: string[],
  unique?: boolean
};

export function getEntityDefinitionFromSchema(type: Type): EntityDefinition | null {
  const metadata = reflectionRegistry.getMetadata(type);

  if (!metadata.registered) {
    return null;
  }

  const properties: Record<string, PropertyDefinition> = {};

  const schema = getSchemaFromReflection(type);

  if (isNotNull(schema)) {
    for (const [key, property] of Object.entries(schema.properties)) {
      const valueTypes = getSchemaValueTypes(property);
      const valueTypesWithoutNullAndUndefined = valueTypes.filter((valueType) => (valueType != 'null') && (valueType != 'undefined'));

      const types = toArray(valueTypesWithoutNullAndUndefined).map(schemaValueTypeToEntityPropertyType);


      properties[key] = {
        type: (types.length > 1) ? types : types[0]!,
        array: (isValueSchema(property) && (property.array == true)),
        optional: valueTypes.includes('undefined') || (isValueSchema(property) && (property.optional == true)),
        nullable: valueTypes.includes('null') || (isValueSchema(property) && (property.nullable == true))
      }
    }
  }

  const definition: EntityDefinition = {
    name: type.name,
    properties,
    indexes: []
  };

  return definition;
}

function schemaValueTypeToEntityPropertyType(valueType: ResolvedValueType): EntityPropertyType {
  if ((valueType == 'undefined') || (valueType == 'null')) {
    throw new Error('null and undefined are not supported');
  }

  if (valueType == String) {
    return 'string';
  }

  if (valueType == Number) {
    return 'number';
  }

  if (valueType == Boolean) {
    return 'boolean';
  }

  if (valueType == 'any') {
    return 'any';
  }

  throw new NotSupportedError(`ValueType ${valueType} not supported.`);
}
