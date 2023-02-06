import type { OneOrMany, WritableOneOrMany } from '#/types';
import { isArray, isNull } from '#/utils/type-guards';

export type HttpValue = string | number | boolean | null;

export type NormalizedHttpValue = string;

export type HttpValueObject = Record<string, OneOrMany<HttpValue>>;

export type NormalizedHttpValueObject = Record<string, WritableOneOrMany<string>>;

export type HttpMethod =
  | 'HEAD'
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS';

export function normalizeHttpValue(value: OneOrMany<HttpValue>): WritableOneOrMany<string> {
  if (isArray(value)) {
    return value.map(normalizeSingleHttpValue);
  }

  return normalizeSingleHttpValue(value);
}

export function normalizeSingleHttpValue(value: HttpValue): string {
  if (isNull(value)) {
    return '[[null]]';
  }

  return value.toString();
}

export function denormalizeHttpValue(value: OneOrMany<HttpValue>): OneOrMany<HttpValue> {
  if (isArray(value)) {
    return value.map(denormlizeSingleHttpValue);
  }

  return denormlizeSingleHttpValue(value);
}

export function denormlizeSingleHttpValue(value: HttpValue): HttpValue {
  if (value == '[[null]]') {
    return null;
  }

  return value;
}
