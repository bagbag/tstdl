import type { EnumerationObject, Simplify } from '#/types';
import { randomItem } from './array/array';
import { memoizeSingle } from './function';

export type EnumEntry<T> = [EnumKey<T>, EnumValue<T>];
export type EnumKey<T> = Extract<keyof T, string>;
export type EnumValue<T> = Simplify<T[EnumKey<T>]>;

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

export function enumEntries<T extends EnumerationObject>(enumeration: T): EnumEntry<T>[] {
  return memoizedEnumEntries(enumeration);
}

export function enumKeys<T extends EnumerationObject>(enumeration: T): EnumKey<T>[] {
  return memoizedEnumKeys(enumeration);
}

export function enumValues<T extends EnumerationObject>(enumeration: T): EnumValue<T>[] {
  return memoizedEnumValues(enumeration);
}

export function randomEnumValue<T extends EnumerationObject>(enumeration: T): EnumValue<T> {
  return randomItem(enumValues(enumeration));
}
