import { Json } from '../types';

export const serialize: unique symbol = Symbol();
export const deserialize: unique symbol = Symbol();

export interface Serializable {
  [serialize](): Json;
}

export interface SerializableStatic extends Function {
  [deserialize](data: any): Serializable;
}
