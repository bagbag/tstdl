import type { AbstractConstructor } from '#/types';
import { toArray } from '#/utils/array/array';
import { isNull, isString, isUndefined } from '#/utils/type-guards';
import type { Schema } from '../schema';
import type { ResolvedValueType, ValueType } from '../types';
import { isObjectSchema, isTypeSchema, isValueSchema, resolveValueType } from '../types';

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

export function getSchemaTypeNames(schema: Schema): string[] {
  if (isTypeSchema(schema)) {
    const name = getValueTypeName(schema.type);
    return [name];
  }

  if (isObjectSchema(schema)) {
    const name = getValueTypeName(schema.sourceType ?? Object);
    return [name];
  }

  if (isValueSchema(schema)) {
    return [...new Set(toArray(schema.schema).flatMap(getSchemaTypeNames))];
  }

  throw new Error('Unsupported schema');
}
