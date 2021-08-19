import { isFunction } from '#/utils';
import type { Json } from '../types';

export const serializeSymbol: unique symbol = Symbol('Symbol for serialization function');
export const deserializeSymbol: unique symbol = Symbol('Symbol for deserialization function');

export interface Serializable {
  [serializeSymbol](): Json;
}

export interface SerializableStatic extends Function {
  [deserializeSymbol](data: any): Serializable;
}

export function isSerializable(value: any): value is Serializable {
  return isFunction((value as Serializable)[serializeSymbol]);
}

export function isSerializableStatic(value: any): value is SerializableStatic {
  return isFunction((value as SerializableStatic)[deserializeSymbol]);
}
