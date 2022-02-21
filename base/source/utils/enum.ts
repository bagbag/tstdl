import type { Simplify, StringMap } from '#/types';
import { memoizeSingle } from './function';

type EnumEntry<T> = [EnumKey<T>, EnumValue<T>];
type EnumKey<T> = Extract<keyof T, string>;
type EnumValue<T> = Simplify<T[Extract<keyof T, string>]>;

function _enumEntries<T>(enumeration: T): EnumEntry<T>[] {
  return Object.entries(enumeration)
    .filter((entry): entry is EnumEntry<T> => Number.isNaN(Number(entry[0])));
}

function _enumKeys<T>(enumeration: T): EnumKey<T>[] {
  return _enumEntries(enumeration).map((entry) => entry[0]);
}

function _enumValues<T>(enumeration: T): EnumValue<T>[] {
  return _enumEntries(enumeration).map((entry) => entry[1]);
}

const memoizedEnumEntries = memoizeSingle(_enumEntries);
const memoizedEnumKeys = memoizeSingle(_enumKeys);
const memoizedEnumValues = memoizeSingle(_enumValues);

export function enumEntries<T extends StringMap<string | number>>(enumeration: T): EnumEntry<T>[] {
  return memoizedEnumEntries(enumeration);
}

export function enumKeys<T extends StringMap<string | number>>(enumeration: T): EnumKey<T>[] {
  return memoizedEnumKeys(enumeration);
}

export function enumValues<T extends StringMap<string | number>>(enumeration: T): EnumValue<T>[] {
  return memoizedEnumValues(enumeration);
}
