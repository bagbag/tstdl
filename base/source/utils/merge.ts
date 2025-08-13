/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { IsEqual, MergeDeep, MergeDeepOptions as TypeFestMergeDeepOptions } from 'type-fest';

import type { If, Merge, Record, TypedOmit } from '#/types/index.js';
import { createArray } from './array/array.js';
import { objectEntries } from './object/object.js';
import { assertArray, assertLiteralObject, assertMap, assertSet, isArray, isLiteralObject, isMap, isSet, isUndefined } from './type-guards.js';

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

  if (isLiteralObject(a)) {
    assertLiteralObject(b, 'Cannot merge object into non-object.');
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

export type MergeDeepOptions = TypedOmit<TypeFestMergeDeepOptions, 'arrayMergeMode'> & { arrayMergeMode?: TypeFestMergeDeepOptions['arrayMergeMode'] | 'mergeItems' };

export function mergeDeep<A extends Record, B extends Record, Options extends MergeDeepOptions = { arrayMergeMode: 'spread', recurseIntoArrays: true }>(a: A, b: B, options?: Options): MergeDeep<A, B, { arrayMergeMode: If<IsEqual<Options['arrayMergeMode'], 'mergeItems'>, 'spread', Exclude<Options['arrayMergeMode'], 'mergeItems'>>, recurseIntoArrays: Options['recurseIntoArrays'] }> {
  const { arrayMergeMode = 'spread', recurseIntoArrays = true } = options ?? {};

  const result = { ...a };

  for (const [key, value] of objectEntries(b)) {
    if (isLiteralObject(a[key]) && isLiteralObject(value)) {
      result[key] = mergeDeep(a[key], value) as any;
    }
    else if (recurseIntoArrays && isArray(a[key]) && isArray(value)) {
      result[key] = mergeArray(a[key], value, arrayMergeMode) as any;
    }
    else {
      result[key] = value;
    }
  }

  return result as any;
}

export function mergeArray<A extends readonly any[], B extends readonly any[], Mode extends NonNullable<MergeDeepOptions['arrayMergeMode']>>(a: A, b: B, mode: Mode): MergeDeep<A, B, { recurseIntoArrays: true, arrayMergeMode: If<IsEqual<Mode, 'mergeItems'>, 'spread', Exclude<Mode, 'mergeItems'>> }> {
  if (mode == 'spread') {
    return [...a, ...b] as any;
  }

  const length = Math.max(a.length, b.length);

  if (mode == 'replace') {
    return createArray(length, (index) => b[index] ?? a[index]) as any;
  }

  return createArray(length, (index) => {
    if (isLiteralObject(a[index]) && isLiteralObject(b[index])) {
      return mergeDeep(a[index], b[index], { arrayMergeMode: mode, recurseIntoArrays: true });
    }
    else if (isArray(a[index]) && isArray(b[index])) {
      return mergeArray(a[index], b[index], mode) as any;
    }

    return b[index] ?? a[index];
  }) as any;
}
