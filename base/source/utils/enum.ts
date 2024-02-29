import type { EnumerationEntries, EnumerationEntry, EnumerationKey, EnumerationObject, EnumerationValue } from '#/types.js';
import { randomItem } from './array/array.js';
import { memoizeSingle } from './function/memoize.js';
import { objectEntries } from './object/object.js';
import { isNumber } from './type-guards.js';

const memoizedEnumEntries = memoizeSingle(
  <T extends EnumerationObject>(enumeration: T) => objectEntries<EnumerationObject>(enumeration).filter((entry): entry is EnumerationEntry<T> => Number.isNaN(Number(entry[0]))) as EnumerationEntries<T>,
  { weak: true }
);

const memoizedEnumKeys = memoizeSingle(
  <T extends EnumerationObject>(enumeration: T) => {
    const entries = enumEntries(enumeration) as EnumerationEntry<T>[];
    return entries.map((entry) => entry[0]);
  },
  { weak: true }
);

const memoizedEnumValues = memoizeSingle(
  <T extends EnumerationObject>(enumeration: T) => {
    const entries = enumEntries(enumeration) as EnumerationEntry<T>[];
    return entries.map((entry) => entry[1] as EnumerationValue<T>);
  },
  { weak: true }
);

export function enumValueName<T extends EnumerationObject>(enumeration: T, value: T[keyof T]): string {
  return isNumber(value) ? enumeration[value]?.toString() ?? value.toString() : value;
}

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
