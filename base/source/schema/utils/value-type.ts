import type { Type } from '#/types';
import { isFunction, isNull, isString, isUndefined } from '#/utils/type-guards';
import type { ResolvedValueType, ValueType } from '../types';

export function getValueType(value: unknown): ResolvedValueType {
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
