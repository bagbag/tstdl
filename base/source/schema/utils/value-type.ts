import type { Type } from '#/types';
import { isArray, isFunction, isNull, isString, isUndefined } from '#/utils/type-guards';
import type { ValueType } from '../types';
import { isObjectSchema, isValueSchema } from '../types';
import { maybeDeferredValueTypesToValueTypes } from './schema';

export function getValueType(value: unknown): ValueType {
  if (isUndefined(value)) {
    return 'undefined';
  }

  if (isNull(value)) {
    return 'null';
  }

  return (value as object).constructor as Type;
}

export function getValueTypeName(valueType: ValueType): string {
  return isString(valueType) ? valueType : isFunction(valueType) ? valueType.name : 'object';
}

export function valueTypeHasValueType(valueType: ValueType, typeToCheck: ValueType): boolean {
  if (isValueSchema(valueType)) {
    const resolvedValueTypes = maybeDeferredValueTypesToValueTypes(valueType.type);

    if (isArray(resolvedValueTypes)) {
      return resolvedValueTypes.some((innerType) => valueTypeHasValueType(innerType, typeToCheck));
    }

    return valueTypeHasValueType(resolvedValueTypes, typeToCheck);
  }

  if (isObjectSchema(valueType)) {
    return false;
  }

  return valueType == typeToCheck;
}
