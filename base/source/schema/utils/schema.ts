import { toArray } from '#/utils/array/array';
import { memoizeSingle } from '#/utils/function/memoize';
import { mapObjectValues } from '#/utils/object/object';
import { isArray } from '#/utils/type-guards';
import type { NormalizedSchema, Schema } from '../schema';
import type { NormalizedObjectSchema, NormalizedObjectSchemaProperties, NormalizedTypeSchema, NormalizedValueSchema, ObjectSchema, TypeSchema, ValueSchema } from '../types';
import { isObjectSchema, isTypeSchema, isValueSchema, resolveValueType, valueSchema, valueTypeOrSchemaToSchema } from '../types';

export const normalizeSchema = memoizeSingle(_normalizeSchema, { weak: true });
export const normalizeObjectSchema = memoizeSingle(_normalizeObjectSchema, { weak: true });
export const normalizeValueSchema = memoizeSingle(_normalizeValueSchema, { weak: true });
export const normalizeTypeSchema = memoizeSingle(_normalizeTypeSchema, { weak: true });
export const getArrayItemSchema = memoizeSingle(_getArrayItemSchema, { weak: true });


function _normalizeSchema<T, O>(schema: Schema<T, O>): NormalizedSchema<T, O> {
  if (isObjectSchema(schema)) {
    return normalizeObjectSchema(schema);
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
