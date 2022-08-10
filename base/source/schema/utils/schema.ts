import { toArray } from '#/utils/array/array';
import { memoizeSingle } from '#/utils/function/memoize';
import { mapObjectValues } from '#/utils/object/object';
import type { NormalizedObjectSchema, NormalizedObjectSchemaProperties, NormalizedValueSchema, ObjectSchema, ValueSchema } from '../types';
import { valueTypesToSchema, deferrableValueTypesToValueTypes } from '../types';

export const normalizeSchema = memoizeSingle(_normalizeObjectSchema, { weak: true });
export const normalizeValueSchema = memoizeSingle(_normalizeValueSchema, { weak: true });
export const getArrayItemSchema = memoizeSingle(_getArrayItemSchema, { weak: true });

export function _normalizeObjectSchema<T, O>(objectSchema: ObjectSchema<T, O>): NormalizedObjectSchema<T, O> {
  const normalizedObjectSchema: NormalizedObjectSchema<T, O> = {
    factory: objectSchema.factory,
    properties: mapObjectValues(objectSchema.properties, valueTypesToSchema) as unknown as NormalizedObjectSchemaProperties<T>,
    mask: objectSchema.mask,
    allowUnknownProperties: new Set(toArray(objectSchema.allowUnknownProperties ?? []).map(valueTypesToSchema))
  };

  return normalizedObjectSchema;
}

export function _normalizeValueSchema<T, O>(valueSchema: ValueSchema<T, O>): NormalizedValueSchema<T, O> {
  const valueTypes = toArray(deferrableValueTypesToValueTypes(valueSchema.type));

  const normalizedValueSchema: NormalizedValueSchema<T, O> = {
    type: new Set(valueTypes),
    array: valueSchema.array ?? false,
    optional: valueSchema.optional ?? false,
    nullable: valueSchema.nullable ?? false,
    coerce: valueSchema.coerce ?? false,
    coercers: new Map(),
    transformers: toArray(valueSchema.transformers ?? []),
    arrayConstraints: toArray(valueSchema.arrayConstraints ?? []),
    valueConstraints: toArray(valueSchema.valueConstraints ?? [])
  };

  for (const coercer of toArray(valueSchema.coercers ?? [])) {
    for (const sourceType of toArray(coercer.sourceType)) {
      if (!normalizedValueSchema.coercers.has(sourceType)) {
        normalizedValueSchema.coercers.set(sourceType, []);
      }

      normalizedValueSchema.coercers.get(sourceType)!.push(coercer);
    }
  }

  return normalizedValueSchema;
}

function _getArrayItemSchema<T, O>(valueSchema: ValueSchema<T, O>): ValueSchema<T, O> {
  const itemSchema: ValueSchema<T, O> = {
    type: valueSchema.type,
    array: false,
    optional: false,
    nullable: false,
    transformers: valueSchema.transformers,
    valueConstraints: valueSchema.valueConstraints
  };

  return itemSchema;
}
