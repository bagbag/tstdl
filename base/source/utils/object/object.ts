/* eslint-disable @typescript-eslint/ban-types */

import type { PickBy, Record } from '#/types';
import { isArray, isObject, isUndefined } from '../type-guards';

export function hasOwnProperty<T extends object>(obj: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function mapObject<T extends Record, K extends string | number | symbol, V>(object: T, mapper: (value: T[keyof T], key: keyof T) => [key: K, value: V]): Record<K, V> {
  const mappedEntries = Object.entries(object).map(([key, value]) => mapper(value as T[keyof T], key));
  return Object.fromEntries(mappedEntries) as Record<K, V>;
}

export function mapObjectValues<T extends Record, V>(object: T, mapper: (value: T[keyof T], key: keyof T) => V): Record<keyof T, V> {
  return mapObject(object, (value, key) => [key, mapper(value, key)]);
}

export function filterObject<T extends Record, U extends T[keyof T]>(object: T, predicate: (value: T[keyof T], key: keyof T) => value is U): PickBy<T, U>;
// export function filterObject<T extends Record>(object: T, predicate: (key: keyof T, value: T[keyof T]) => boolean): Partial<T>;
export function filterObject<T extends Record>(object: T, predicate: (value: T[keyof T], key: keyof T) => boolean): Partial<T> {
  const mappedEntries = Object.entries(object).filter(([key, value]) => predicate(value as T[keyof T], key));
  return Object.fromEntries(mappedEntries) as Partial<T>;
}

export function copyObjectProperties<T, U extends T>(source: T, target: U): void {
  for (const [key, value] of Object.entries(source) as [keyof T, any][]) {
    target[key] = value;
  }
}

export function getGetter<T extends object, U extends keyof T>(obj: T, property: keyof T, bind: boolean): () => T[U] {
  if (!(property in obj)) {
    throw new Error(`property ${property as string} does not exist`);
  }

  let objOrPrototype = obj as object;

  while (!hasOwnProperty<Record>(objOrPrototype, property)) {
    objOrPrototype = Object.getPrototypeOf(objOrPrototype) as object;
  }

  const descriptor = Object.getOwnPropertyDescriptor(objOrPrototype, property);

  if (descriptor == undefined) {
    throw new Error('could not get property descriptor');
  }

  if (descriptor.get == undefined) {
    throw new Error(`property ${property as string} has no getter`);
  }

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getter = bind ? descriptor.get.bind(obj) : descriptor.get;
  return getter;
}

export function deepEntries(object: Record, keepInnerObjects: boolean = false, prefix?: string): [string, any][] {
  const rawEntries: [string, any][] = isUndefined(prefix)
    ? Object.entries(object)
    : Object.entries(object).map(([key, value]) => [`${prefix}${key}`, value]);

  let entries: [string, any][] = [];

  for (const [key, value] of rawEntries) {
    if (isObject(value) || isArray(value)) {
      if (keepInnerObjects) {
        entries.push([key, value]);
      }

      entries = [...entries, ...deepEntries(value, keepInnerObjects, `${key}.`)];
    }
    else {
      entries.push([key, value]);
    }
  }

  return entries;
}
