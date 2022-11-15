import { objectKeys } from './object/object';

export const reflectMethodsMap: Record<keyof ProxyHandler<object>, true> = {
  apply: true,
  construct: true,
  defineProperty: true,
  deleteProperty: true,
  get: true,
  getOwnPropertyDescriptor: true,
  getPrototypeOf: true,
  has: true,
  isExtensible: true,
  ownKeys: true,
  preventExtensions: true,
  set: true,
  setPrototypeOf: true
};

export type ReflectMethodsReturnTypeMap = { [P in keyof ProxyHandler<object>]-?: ReturnType<Required<ProxyHandler<object>>[P]> };

export const reflectMethods = objectKeys(reflectMethodsMap);

export const propertyReflectMethods = new Set<keyof ProxyHandler<object>>(['defineProperty', 'deleteProperty', 'get', 'getOwnPropertyDescriptor', 'has', 'set']);
