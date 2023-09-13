/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { Merge, Record } from '#/types.js';
import { assertArray, assertMap, assertObject, assertSet, isArray, isMap, isObject, isSet, isUndefined } from './type-guards.js';

type BaseType = Record | any[] | Map<any, any> | Set<any>;

export function merge<A extends BaseType, B extends BaseType>(a: A | undefined, b: B | undefined):
  A extends (infer T)[] ? B extends (infer U)[] ? (T | U)[] : never
  : A extends Map<infer K, infer V> ? B extends Map<infer K2, infer V2> ? Map<K | K2, V | V2> : never
  : A extends Set<infer T> ? B extends Set<infer U> ? Set<T | U> : never
  : A extends Record ? B extends Record ? Merge<A, B> : never
  : never {
  if (isUndefined(a)) {
    return b as any;
  }

  if (isUndefined(b)) {
    return a as any;
  }

  if (isObject(a)) {
    assertObject(b, 'Cannot merge object into non-object.');
    return { ...a, ...b } as any;
  }
  else if (isArray(a)) {
    assertArray(b, 'Cannot merge array into non-array.');
    return [...a, ...b] as any;
  }
  else if (isMap(a)) {
    assertMap(b, 'Cannot merge map into non-map.');
    return new Map([...a, ...b]) as any;
  }
  else if (isSet(a)) {
    assertSet(b, 'Cannot merge set into non-set.');
    return new Set([...a, ...b]) as any;
  }

  throw new Error('Merging of data can only be done with objects, arrays, maps and sets.');
}
