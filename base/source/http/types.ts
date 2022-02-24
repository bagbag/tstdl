import type { OneOrMany, UndefinableJson } from '#/types';
import { isArray, isNull } from '#/utils/type-guards';

export const abortToken: unique symbol = Symbol('abortToken');

export type HttpValue = string | number | boolean | null;

export type NormalizedHttpValue = string;

export type HttpValueObject = Record<string, OneOrMany<HttpValue>>;

export type NormalizedHttpValueObject = Record<string, OneOrMany<string>>;


export type HttpClientRequestContext<T extends Record<any, unknown> = Record<any, unknown>> = T;

export type HttpMethod =
  | 'head'
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete';

export type HttpNoneBodyType = 'none';
export type HttpTextBodyType = 'text';
export type HttpJsonBodyType = 'json';
export type HttpBufferBodyType = 'buffer';
export type HttpStreamBodyType = 'stream';

export type HttpBodyType =
  | HttpNoneBodyType
  | HttpTextBodyType
  | HttpJsonBodyType
  | HttpBufferBodyType
  | HttpStreamBodyType;

export type HttpBody<B extends HttpBodyType = HttpBodyType>
  = B extends HttpNoneBodyType ? undefined
  : B extends HttpTextBodyType ? string
  : B extends HttpJsonBodyType ? UndefinableJson
  : B extends HttpBufferBodyType ? Uint8Array
  : B extends HttpStreamBodyType ? AsyncIterable<Uint8Array>
  : undefined;

export function normalizeHttpValue(value: OneOrMany<HttpValue>): OneOrMany<string> {
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
