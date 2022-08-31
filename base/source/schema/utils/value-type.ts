import type { AbstractConstructor } from '#/types';
import { toArray } from '#/utils/array/array';
import { isFunction, isNull, isString, isUndefined } from '#/utils/type-guards';
import type { SchemaTestable } from '../schema';
import type { ResolvedValueType, ValueType } from '../types';
import { isDeferredValueType, isObjectSchema, isTypeSchema, isValueSchema, resolveValueType } from '../types';

export function getValueType(value: unknown): ResolvedValueType<any> {
  if (isUndefined(value)) {
    return 'undefined';
  }

  if (isNull(value)) {
    return 'null';
  }

  return (value as object).constructor as AbstractConstructor;
}

export function getValueTypeName(valueType: ValueType): string {
  const resolvedValueType = resolveValueType(valueType);

  return isString(resolvedValueType)
    ? resolvedValueType
    : resolvedValueType.name;
}

export function getSchemaTypeNames(schema: SchemaTestable): string[] {
  if (isTypeSchema(schema)) {
    const name = getValueTypeName(schema.type);
    return [name];
  }

  if (isFunction(schema)) {
    const name = getValueTypeName(schema);
    return [name];
  }

  if (isString(schema)) {
    return [schema];
  }

  if (isObjectSchema(schema)) {
    const name = getValueTypeName(schema.sourceType ?? Object);
    return [name];
  }

  if (isValueSchema(schema)) {
    return [...new Set(toArray(schema.schema).flatMap(getSchemaTypeNames))];
  }

  if (isDeferredValueType(schema)) {
    return getSchemaTypeNames(resolveValueType(schema));
  }

  throw new Error('Unsupported schema');
}
