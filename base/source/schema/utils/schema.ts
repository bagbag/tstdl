import { toArray } from '#/utils/array/array';
import { memoizeSingle } from '#/utils/function/memoize';
import { mapObjectValues } from '#/utils/object/object';
import { isArray, isFunction, isString } from '#/utils/type-guards';
import type { Schema } from '../schema';
import type { MaybeDeferredValueTypes, NormalizedObjectSchema, NormalizedValueSchema, ObjectSchema, ValueSchema, ValueTypes } from '../types';
import { isDeferredValueType } from '../types';

export const normalizeSchema = memoizeSingle(_normalizeObjectSchema, { weak: true });
export const normalizeValueSchema = memoizeSingle(_normalizeValueSchema, { weak: true });
export const getArrayItemSchema = memoizeSingle(_getArrayItemSchema, { weak: true });

export function _normalizeObjectSchema<T>(objectSchema: ObjectSchema<T>): NormalizedObjectSchema<T> {
  const normalizedObjectSchema: NormalizedObjectSchema = {
    factory: objectSchema.factory,
    properties: mapObjectValues(objectSchema.properties, maybeDeferredValueTypesToSchema),
    mask: objectSchema.mask,
    allowUnknownProperties: new Set(toArray(objectSchema.allowUnknownProperties ?? []).map(maybeDeferredValueTypesToSchema))
  };

  return normalizedObjectSchema;
}

export function _normalizeValueSchema<T>(valueSchema: ValueSchema<T>): NormalizedValueSchema<T> {
  const valueTypes = maybeDeferredValueTypesToValueTypes(valueSchema.type);

  const normalizedValueSchema: NormalizedValueSchema<T> = {
    type: new Set(toArray(valueTypes)),
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

function _getArrayItemSchema<T>(valueSchema: ValueSchema<T>): ValueSchema<T> {
  const itemSchema: ValueSchema<T> = {
    type: valueSchema.type,
    array: false,
    optional: false,
    nullable: false,
    transformers: valueSchema.transformers,
    valueConstraints: valueSchema.valueConstraints
  };

  return itemSchema;
}

export function maybeDeferredValueTypesToValueTypes<T>(valueTypes: MaybeDeferredValueTypes<T>): ValueTypes<T> {
  if (isArray(valueTypes)) {
    return valueTypes.flatMap((valueType) => maybeDeferredValueTypesToValueTypes(valueType));
  }

  return isDeferredValueType<T>(valueTypes)
    ? valueTypes.deferred()
    : valueTypes;
}

export function valueTypesToSchema<T>(valueType: ValueTypes<T>): Schema<T> {
  if (isFunction(valueType) || isArray(valueType) || isString(valueType)) {
    return { type: valueType };
  }

  return valueType;
}

export function maybeDeferredValueTypesToSchema<T>(valueType: MaybeDeferredValueTypes<T>): Schema<T> {
  const deferredValueTypes = maybeDeferredValueTypesToValueTypes(valueType);
  return valueTypesToSchema(deferredValueTypes);
}
