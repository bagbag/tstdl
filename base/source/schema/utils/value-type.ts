import type { AbstractConstructor, OneOrMany } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { isArray, isFunction, isNull, isString, isUndefined } from '#/utils/type-guards.js';
import type { SchemaTestable } from '../schema.js';
import type { ResolvedValueType, ValueType } from '../types/types.js';
import { isDeferredValueType, isObjectSchema, isTypeSchema, isValueSchema, resolveValueType, resolveValueTypes } from '../types/types.js';

export function getValueType(value: unknown): ResolvedValueType {
  if (isUndefined(value)) {
    return 'undefined';
  }

  if (isNull(value)) {
    return 'null';
  }

  return (value as object).constructor as AbstractConstructor;
}

export function includesValueType(valueType: ValueType, valueTypes: OneOrMany<ValueType>): boolean {
  const resolvedValueTypes = resolveValueTypes(valueTypes);
  const resolvedValueType = resolveValueType(valueType);

  if (isArray(resolvedValueTypes)) {
    return resolvedValueTypes.includes(resolvedValueType);
  }

  return resolvedValueType == resolvedValueTypes;
}

export function getValueTypeName(valueType: ValueType): string {
  const resolvedValueType = resolveValueType(valueType);

  return isString(resolvedValueType)
    ? resolvedValueType
    : resolvedValueType.name;
}

export function getSchemaTypeNames(schema: SchemaTestable): string[] {
  return getSchemaValueTypes(schema)
    .map((valueType) => (isString(valueType) ? valueType : valueType.name));
}

export function getSchemaValueTypes(schema: OneOrMany<SchemaTestable>): ResolvedValueType[] {
  if (isTypeSchema(schema)) {
    return [resolveValueType(schema.type)];
  }

  if (isFunction(schema)) {
    return [schema];
  }

  if (isString(schema)) {
    return [schema];
  }

  if (isObjectSchema(schema)) {
    return [resolveValueType(schema.sourceType ?? Object)];
  }

  if (isValueSchema(schema)) {
    return [...new Set(toArray(schema.schema).flatMap(getSchemaValueTypes))];
  }

  if (isDeferredValueType(schema)) {
    return getSchemaValueTypes(resolveValueType(schema));
  }

  if (isArray(schema)) {
    return schema.flatMap(getSchemaValueTypes);
  }

  throw new Error('Unsupported schema');
}
