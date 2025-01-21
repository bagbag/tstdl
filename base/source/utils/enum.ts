import type { EnumerationEntries, EnumerationEntry, EnumerationKey, EnumerationObject, EnumerationValue, Record } from '#/types.js';
import { randomItem } from './array/array.js';
import { memoizeSingle } from './function/memoize.js';
import { mapObject, objectEntries } from './object/object.js';

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

const memoizedReversedEnum = memoizeSingle(
  <T extends EnumerationObject>(enumeration: T) => mapObject(enumeration, (value, key) => [value, key] as const) as any as { [P in keyof T as T[P]]: P },
  { weak: true }
);

export function enumValueName<T extends EnumerationObject>(enumeration: T, value: T[keyof T]): EnumerationKey<T> {
  return (reversedEnum(enumeration) as Record)[value] as EnumerationKey<T>;
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

export function reversedEnum<T extends EnumerationObject>(enumeration: T): { [P in keyof T as T[P]]: P } {
  return memoizedReversedEnum(enumeration);
}
