import type { EnumerationEntries, EnumerationEntry, EnumerationKey, EnumerationObject, EnumerationValue } from '#/types';
import { randomItem } from './array/array';
import { memoizeSingle } from './function';

const memoizedEnumEntries = memoizeSingle(_enumEntries, { weak: true });
const memoizedEnumKeys = memoizeSingle(_enumKeys, { weak: true });
const memoizedEnumValues = memoizeSingle(_enumValues, { weak: true });

export function enumEntries<T extends EnumerationObject>(enumeration: T): EnumerationEntries<T> {
  return memoizedEnumEntries(enumeration);
}

export function enumKeys<T extends EnumerationObject>(enumeration: T): EnumerationKey<T>[] {
  return memoizedEnumKeys(enumeration);
}

export function enumValues<T extends EnumerationObject>(enumeration: T): EnumerationValue<T>[] {
  return memoizedEnumValues(enumeration);
}

export function randomEnumValue<T extends EnumerationObject>(enumeration: T): EnumerationValue<T> {
  return randomItem(enumValues(enumeration));
}

function _enumEntries<T extends EnumerationObject>(enumeration: T): EnumerationEntries<T> {
  return Object.entries(enumeration)
    .filter((entry): entry is EnumerationEntry<T> => Number.isNaN(Number(entry[0]))) as EnumerationEntries<T>;
}

function _enumKeys<T extends EnumerationObject>(enumeration: T): EnumerationKey<T>[] {
  const entries = enumEntries(enumeration) as EnumerationEntry<T>[];
  return entries.map((entry) => entry[0]);
}

function _enumValues<T extends EnumerationObject>(enumeration: T): EnumerationValue<T>[] {
  const entries = enumEntries(enumeration) as EnumerationEntry<T>[];
  return entries.map((entry) => entry[1] as EnumerationValue<T>);
}
