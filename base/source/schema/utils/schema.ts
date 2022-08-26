import { reflectionRegistry } from '#/reflection/registry';
import type { AbstractConstructor, Type } from '#/types';
import { toArray } from '#/utils/array/array';
import { memoizeSingle } from '#/utils/function/memoize';
import { mapObjectValues } from '#/utils/object/object';
import { isArray, isDefined, isNotNull, isUndefined } from '#/utils/type-guards';
import type { SchemaPropertyReflectionData, SchemaTypeReflectionData } from '../decorators/types';
import type { NormalizedSchema, Schema } from '../schema';
import { assign } from '../schemas/assign';
import type { NormalizedObjectSchema, NormalizedObjectSchemaProperties, NormalizedTypeSchema, NormalizedValueSchema, ObjectSchema, ObjectSchemaProperties, TypeSchema, ValueSchema } from '../types';
import { isObjectSchema, isTypeSchema, isValueSchema, objectSchema, resolveValueType, valueSchema, valueTypeOrSchemaToSchema, valueTypesOrSchemasToSchemas } from '../types';

export const normalizeSchema = memoizeSingle(_normalizeSchema, { weak: true });
export const normalizeObjectSchema = memoizeSingle(_normalizeObjectSchema, { weak: true });
export const normalizeValueSchema = memoizeSingle(_normalizeValueSchema, { weak: true });
export const normalizeTypeSchema = memoizeSingle(_normalizeTypeSchema, { weak: true });
export const getArrayItemSchema = memoizeSingle(_getArrayItemSchema, { weak: true });
export const getSchemaFromReflection = memoizeSingle(_getObjectSchemaFromReflection, { weak: true });

function _normalizeSchema<T, O>(schema: Schema<T, O>): NormalizedSchema<T, O> {
  if (isObjectSchema(schema)) {
    return normalizeObjectSchema(schema) as NormalizedSchema<T, O>;
  }

  if (isValueSchema(schema)) {
    return normalizeValueSchema(schema);
  }

  if (isTypeSchema(schema)) {
    return normalizeTypeSchema(schema);
  }

  throw new Error('Unsupported schema.');
}

function _normalizeObjectSchema<T, O>(schema: ObjectSchema<T, O>): NormalizedObjectSchema<T, O> {
  const normalizedSchema: NormalizedObjectSchema<T, O> = {
    factory: schema.factory,
    properties: mapObjectValues(schema.properties, (propertyValueType) => (isArray(propertyValueType) ? valueSchema<any>(propertyValueType) : propertyValueType)) as unknown as NormalizedObjectSchemaProperties<T>,
    mask: schema.mask,
    allowUnknownProperties: new Set(toArray(schema.allowUnknownProperties ?? []).map(valueTypeOrSchemaToSchema))
  };

  return normalizedSchema;
}

function _normalizeValueSchema<T, O>(schema: ValueSchema<T, O>): NormalizedValueSchema<T, O> {
  const normalizedValueSchema: NormalizedValueSchema<T, O> = {
    schema: new Set(toArray(schema.schema)),
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
    foo: resolveValueType(schema.type)
  };

  return normalizedSchema;
}

function _getArrayItemSchema<T, O>(schema: ValueSchema<T, O>): ValueSchema<T, O> {
  const itemSchema: ValueSchema<T, O> = {
    schema: schema.schema,
    array: false,
    optional: false,
    nullable: false,
    transformers: schema.transformers,
    valueConstraints: schema.valueConstraints
  };

  return itemSchema;
}

function _getObjectSchemaFromReflection<T>(type: AbstractConstructor<T>): ObjectSchema<T> | null {
  const metadata = reflectionRegistry.getMetadata(type);

  if (!metadata.registered) {
    return null;
  }

  const typeData = metadata.data.tryGet<SchemaTypeReflectionData>('schema');
  const properties: ObjectSchemaProperties<T> = {} as ObjectSchemaProperties<T>;

  for (const [key, propertyMetadata] of metadata.properties) {
    const reflectionData = propertyMetadata.data.tryGet<Partial<SchemaPropertyReflectionData>>('schema');
    const itemType = (isDefined(reflectionData) && isDefined(reflectionData.type)) ? reflectionData.type : undefined;
    const array = (reflectionData?.array == true) ? true : undefined;

    if (array && (isUndefined(itemType) || (isArray(itemType) && (itemType.length == 0)))) {
      throw new Error(`Item type missing on type ${type.name} at property "${String(key)}"`);
    }

    properties[key as keyof T] = valueSchema(valueTypesOrSchemasToSchemas(itemType ?? propertyMetadata.type), {
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

  const schema: ObjectSchema = objectSchema({
    sourceType: type,
    factory: isDefined(typeData?.factory) ? { builder: typeData!.factory } : { type: type as Type },
    properties,
    mask: typeData?.mask,
    allowUnknownProperties: (isUndefined(typeData?.allowUnknownProperties) || (isArray(typeData?.allowUnknownProperties) && (typeData?.allowUnknownProperties.length == 0))) ? undefined : typeData?.allowUnknownProperties
  });

  const prototype = Reflect.getPrototypeOf(type) as AbstractConstructor;

  if (isNotNull(prototype) && reflectionRegistry.hasType(prototype)) {
    const parentSchema = getSchemaFromReflection(prototype)!;
    return assign(parentSchema, schema) as ObjectSchema<T>;
  }

  return schema;
}
