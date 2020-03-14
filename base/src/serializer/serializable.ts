import { Json } from '../types';

export const serializeSymbol: unique symbol = Symbol('Symbol for serialization function');
export const deserializeSymbol: unique symbol = Symbol('Symbol for deserialization function');

export interface Serializable {
  [serializeSymbol](): Json;
}

export interface SerializableStatic extends Function {
  [deserializeSymbol](data: any): Serializable;
}
