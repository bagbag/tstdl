import { isFunction } from './type-guards.js';

export type ValueOrProvider<T> = T extends () => any ? never : T | (() => T);

export function resolveValueOrProvider<T>(valueOrProvider: ValueOrProvider<T>): T {
  if (isFunction(valueOrProvider)) {
    return valueOrProvider() as T;
  }

  return valueOrProvider as T;
}
