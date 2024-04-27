import type { TypeMetadata } from '#/reflection/registry.js';
import { reflectionRegistry } from '#/reflection/registry.js';
import type { AbstractConstructor, Type } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { memoizeSingle } from '#/utils/function/memoize.js';
import { mapObjectValues } from '#/utils/object/object.js';
import { isArray, isDefined, isFunction, isNotNull, isNull, isUndefined } from '#/utils/type-guards.js';
import type { SchemaPropertyReflectionData, SchemaTypeReflectionData } from '../decorators/types.js';
import type { NormalizedSchema, Schema } from '../schema.js';
import { assign } from '../schemas/assign.js';
import type { NormalizedObjectSchema, NormalizedObjectSchemaProperties, NormalizedTypeSchema, NormalizedValueSchema, ObjectSchema, ObjectSchemaOrType, ObjectSchemaProperties, TypeSchema, ValueSchema } from '../types/index.js';
import { isObjectSchema, isTypeSchema, isValueSchema, objectSchema, resolveValueType, schemaTestableToSchema, schemaTestablesToSchemas, valueSchema } from '../types/index.js';

export const normalizeSchema = memoizeSingle(_normalizeSchema, { weak: true });
export const normalizeObjectSchema = memoizeSingle(_normalizeObjectSchema, { weak: true });
export const normalizeValueSchema = memoizeSingle(_normalizeValueSchema, { weak: true });
export const normalizeTypeSchema = memoizeSingle(_normalizeTypeSchema, { weak: true });
export const getArrayItemSchema = memoizeSingle(_getArrayItemSchema, { weak: true });
export const tryGetObjectSchemaFromReflection = memoizeSingle(_tryGetObjectSchemaFromReflection, { weak: true });

export function getObjectSchema<T>(schemaOrType: ObjectSchemaOrType<T>): ObjectSchema<T> {
  return isFunction(schemaOrType)
    ? getObjectSchemaFromReflection(schemaOrType)
    : schemaOrType;
}

function _normalizeSchema<T>(schema: Schema<T>): NormalizedSchema<T> {
  if (isObjectSchema(schema)) {
    return normalizeObjectSchema(schema) as NormalizedSchema<T>;
  }

  if (isValueSchema(schema)) {
    return normalizeValueSchema(schema);
  }

  if (isTypeSchema(schema)) {
    return normalizeTypeSchema(schema);
  }

  throw new Error('Unsupported schema.');
}

function _normalizeObjectSchema<T>(schema: ObjectSchema<T>): NormalizedObjectSchema<T> {
  const unknownPropertiesSchema = (isDefined(schema.unknownProperties) && (!isArray(schema.unknownProperties) || (schema.unknownProperties.length > 0))) ? schemaTestablesToSchemas(schema.unknownProperties) : undefined;
  const unknownPropertiesKeySchema = (isDefined(schema.unknownPropertiesKey) && (!isArray(schema.unknownPropertiesKey) || (schema.unknownPropertiesKey.length > 0))) ? schemaTestablesToSchemas(schema.unknownPropertiesKey) : undefined;
  const allowUnknownProperties = ((isArray(unknownPropertiesSchema) && (unknownPropertiesSchema.length > 0)) || isDefined(unknownPropertiesSchema));

  const normalizedSchema: NormalizedObjectSchema<T> = {
    factory: schema.factory,
    properties: mapObjectValues(schema.properties, (propertyValueType) => schemaTestablesToSchemas(propertyValueType)) as NormalizedObjectSchemaProperties<T>,
    mask: schema.mask,
    allowUnknownProperties,
    unknownProperties: isArray(unknownPropertiesSchema) ? valueSchema(unknownPropertiesSchema) : unknownPropertiesSchema,
    unknownPropertiesKey: isArray(unknownPropertiesKeySchema) ? valueSchema(unknownPropertiesKeySchema) : unknownPropertiesKeySchema
  };

  return normalizedSchema;
}

function _normalizeValueSchema<T>(schema: ValueSchema<T>): NormalizedValueSchema<T> {
  const normalizedValueSchema: NormalizedValueSchema<T> = {
    schema: [...new Set(toArray(schema.schema))].map(schemaTestableToSchema),
    array: schema.array ?? false,
    optional: schema.optional ?? false,
    nullable: schema.nullable ?? false,
    coerce: schema.coerce ?? false,
    coercers: new Map(),
    transformers: toArray(schema.transformers ?? []),
    arrayConstraints: toArray(schema.arrayConstraints ?? []),
    valueConstraints: toArray(schema.valueConstraints ?? [])
  };

  for (const coercer of toArray(schema.coercers ?? [])) {
    for (const sourceType of toArray(coercer.sourceType)) {
      if (!normalizedValueSchema.coercers.has(sourceType)) {
        normalizedValueSchema.coercers.set(sourceType, []);
      }

      normalizedValueSchema.coercers.get(sourceType)!.push(coercer);
    }
  }

  return normalizedValueSchema;
}

function _normalizeTypeSchema<T>(schema: TypeSchema<T>): NormalizedTypeSchema<T> {
  const normalizedSchema: NormalizedTypeSchema<T> = {
    type: resolveValueType(schema.type)
  };

  return normalizedSchema;
}

function _getArrayItemSchema<T>(schema: ValueSchema<T>): ValueSchema<T> {
  const itemSchema: ValueSchema<T> = {
    schema: schema.schema,
    transformers: schema.transformers,
    valueConstraints: schema.valueConstraints
  };

  return itemSchema;
}

export function getObjectSchemaFromReflection<T>(type: AbstractConstructor<T>): ObjectSchema<T> {
  const schema = tryGetObjectSchemaFromReflection(type);

  if (isNull(schema)) {
    throw new Error(`Could not get schema for ${type.name} from reflection data.`);
  }

  return schema;
}

function _tryGetObjectSchemaFromReflection<T>(type: AbstractConstructor<T>): ObjectSchema<T> | null {
  const metadata = reflectionRegistry.getMetadata(type);

  if (isUndefined(metadata)) {
    return null;
  }

  const typeData = metadata.data.tryGet<SchemaTypeReflectionData>('schema') ?? {};

  const dataSchema = isTypeSchema(typeData.schema)
    ? getObjectSchema(typeData.schema.type as Type<T>)
    : isObjectSchema(typeData.schema)
      ? typeData.schema
      : isFunction(typeData.schema)
        ? getObjectSchema(typeData.schema as Type)
        : undefined;

  const schema: ObjectSchema = objectSchema({
    sourceType: type,
    factory: isDefined(typeData.factory) ? { builder: typeData.factory } : { type: type as Type },
    properties: dataSchema?.properties ?? getObjectSchemaPropertiesFromReflection<T>(metadata, type),
    mask: typeData.mask ?? dataSchema?.mask,
    unknownProperties: ((isUndefined(typeData.unknownProperties) || (isArray(typeData.unknownProperties) && (typeData.unknownProperties.length == 0))) ? undefined : typeData.unknownProperties) ?? dataSchema?.unknownProperties,
    unknownPropertiesKey: ((isUndefined(typeData.unknownPropertiesKey) || (isArray(typeData.unknownPropertiesKey) && (typeData.unknownPropertiesKey.length == 0))) ? undefined : typeData.unknownPropertiesKey) ?? dataSchema?.unknownPropertiesKey
  });

  if (isUndefined(dataSchema)) {
    const prototype = Reflect.getPrototypeOf(type) as AbstractConstructor;

    if (isNotNull(prototype) && reflectionRegistry.hasType(prototype)) {
      const parentSchema = getObjectSchemaFromReflection(prototype);
      return assign(parentSchema, schema) as ObjectSchema;
    }
  }

  return schema;
}

function getObjectSchemaPropertiesFromReflection<T>(metadata: TypeMetadata, type: AbstractConstructor<T>): ObjectSchemaProperties<T> {
  const properties: ObjectSchemaProperties<T> = {} as ObjectSchemaProperties<T>;

  for (const [key, propertyMetadata] of metadata.properties) {
    const reflectionData = propertyMetadata.data.tryGet<SchemaPropertyReflectionData>('schema');
    const itemType = reflectionData?.schema;
    const array = (reflectionData?.array == true) ? true : undefined;

    if (array && (isUndefined(itemType) || (isArray(itemType) && (itemType.length == 0)))) {
      throw new Error(`Item type missing on type ${type.name} at property "${String(key)}"`);
    }

    properties[key as keyof T] = valueSchema(schemaTestablesToSchemas(itemType ?? propertyMetadata.type), {
      array,
      optional: reflectionData?.optional,
      nullable: reflectionData?.nullable,
      coerce: reflectionData?.coerce,
      coercers: reflectionData?.coercers,
      transformers: reflectionData?.transformers,
      arrayConstraints: reflectionData?.arrayConstraints,
      valueConstraints: reflectionData?.valueConstraints
    });
  }

  return properties;
}
