import type { PickBy, Record } from '#/types';
import { filterAsync, mapAsync, toArrayAsync } from '../async-iterable-helpers';
import { isArray, isObject, isSymbol, isUndefined } from '../type-guards';

export function hasOwnProperty<T extends Record>(obj: T, key: keyof T): boolean {
  // eslint-disable-next-line prefer-object-has-own
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * returns object entries including those with symbols keys (which Object.entries does not)
 */
export function objectEntries<T extends object>(object: T): [keyof T, T[keyof T]][] {
  const keys = objectKeys(object);
  return keys.map((key) => [key, object[key]]);
}

/**
 * returns object keys including symbols (which Object.keys does not)
 */
export function objectKeys<T extends object>(object: T): (keyof T)[] {
  return Reflect.ownKeys(object) as (keyof T)[];
}

export function mapObject<T extends Record, K extends string | number | symbol, V>(object: T, mapper: (value: T[keyof T], key: keyof T) => [key: K, value: V]): Record<K, V> {
  const mappedEntries = objectEntries(object).map(([key, value]) => mapper(value, key));
  return Object.fromEntries(mappedEntries) as Record<K, V>;
}

export async function mapObjectAsync<T extends Record, K extends string | number | symbol, V>(object: T, mapper: (value: T[keyof T], key: keyof T) => Promise<[key: K, value: V]>): Promise<Record<K, V>> {
  const entries = objectEntries(object);
  const mappedEntries = await toArrayAsync(mapAsync(entries, async ([key, value]) => mapper(value, key)));
  return Object.fromEntries(mappedEntries) as Record<K, V>;
}

export function mapObjectValues<T extends Record, V>(object: T, mapper: (value: T[keyof T], key: keyof T) => V): Record<keyof T, V> {
  return mapObject(object, (value, key) => [key, mapper(value, key)]);
}

export async function mapObjectValuesAsync<T extends Record, V>(object: T, mapper: (value: T[keyof T], key: keyof T) => Promise<V>): Promise<Record<keyof T, V>> {
  return mapObjectAsync(object, async (value, key) => [key, await mapper(value, key)]);
}

export function filterObject<T extends Record, U extends T[keyof T]>(object: T, predicate: (value: T[keyof T], key: keyof T) => value is U): PickBy<T, U>;
export function filterObject<T extends Record>(object: T, predicate: (value: T[keyof T], key: keyof T) => boolean): Partial<T>;
export function filterObject<T extends Record>(object: T, predicate: (value: T[keyof T], key: keyof T) => boolean): Partial<T> {
  const mappedEntries = objectEntries(object).filter(([key, value]) => predicate(value, key));
  return Object.fromEntries(mappedEntries) as Partial<T>;
}

export async function filterObjectAsync<T extends Record>(object: T, predicate: (value: T[keyof T], key: keyof T) => Promise<boolean>): Promise<Partial<T>> {
  const entries = objectEntries(object);
  const mappedEntries = await toArrayAsync(filterAsync(entries, async ([key, value]) => predicate(value, key)));
  return Object.fromEntries(mappedEntries) as Partial<T>;
}

export function copyObjectProperties<T extends object, U extends T>(source: T, target: U): void {
  for (const [key, value] of objectEntries(source) as [keyof T, any][]) {
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
  const allEntries = objectEntries(object) as [string, any][];

  for (const entry of allEntries) {
    if (isSymbol(entry[0])) {
      throw new Error('Deep entries does not support symbols.');
    }
  }

  const rawEntries = isUndefined(prefix)
    ? allEntries
    : allEntries.map(([key, value]) => [`${prefix}${key}`, value] as const);

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
