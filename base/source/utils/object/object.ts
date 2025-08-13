import { JsonPath, type JsonPathInput } from '#/json-path/json-path.js';
import type { BaseType, FromEntries, ObjectLiteral, Optionalize, PickBy, Record, SimplifyObject, UnionToIntersection } from '#/types/index.js';
import { filterAsync } from '../async-iterable-helpers/filter.js';
import { mapAsync } from '../async-iterable-helpers/map.js';
import { toArrayAsync } from '../async-iterable-helpers/to-array.js';
import { isArray, isDefined, isObject, isSymbol, isUndefined } from '../type-guards.js';

export function hasOwnProperty<T extends Record, K extends keyof UnionToIntersection<T>>(obj: T, key: K): obj is Extract<T, Partial<Record<K>>>;
export function hasOwnProperty<T extends Record>(obj: T, key: keyof T): boolean;
export function hasOwnProperty<T extends Record>(obj: T, key: keyof T): boolean {
  return Object.hasOwn(obj, key);
}

/**
 * Returns object entries including those with symbols keys (which Object.entries does not)
 */
export function objectEntries<T extends ObjectLiteral>(object: T): [keyof T, T[keyof T]][] {
  const keys = objectKeys(object);
  return keys.map((key) => [key, object[key]]);
}

/**
 * Returns object keys including symbols (which Object.keys does not)
 */
export function objectKeys<T extends ObjectLiteral>(object: T): (keyof T)[] {
  return (Reflect.ownKeys(object) as (keyof T)[]).filter((key) => key != '__proto__');
}

export function objectValues<T extends ObjectLiteral>(object: T): (T[keyof T])[] {
  return objectKeys(object).map((key) => object[key]);
}

export function fromEntries<A>(entries: A): FromEntries<A>;
export function fromEntries<K extends PropertyKey, T>(entries: Iterable<readonly [K, T]>): Record<K, T>;
export function fromEntries<K extends PropertyKey, T>(entries: Iterable<readonly [K, T]>): Record<K, T> {
  return Object.fromEntries(entries) as Record<K, T>;
}

export function mapObject<T extends ObjectLiteral, K extends PropertyKey, V>(object: T, mapper: (value: T[keyof T], key: keyof T) => [key: K, value: V]): Record<K, V> {
  const mappedEntries = objectKeys(object).map((key) => mapper(object[key], key));
  return Object.fromEntries(mappedEntries) as Record<K, V>;
}

export async function mapObjectAsync<T extends ObjectLiteral, K extends PropertyKey, V>(object: T, mapper: (value: T[keyof T], key: keyof T) => Promise<[key: K, value: V]>): Promise<Record<K, V>> {
  const entries = objectKeys(object);
  const mappedEntries = await toArrayAsync(mapAsync(entries, async (key) => await mapper(object[key], key)));
  return Object.fromEntries(mappedEntries) as Record<K, V>;
}

export function mapObjectValues<T extends ObjectLiteral, V>(object: T, mapper: (value: T[keyof T], key: keyof T) => V): Record<keyof T, V> {
  return mapObject(object, (value, key) => [key, mapper(value, key)]);
}

export function mapObjectKeys<T extends ObjectLiteral, K extends PropertyKey>(object: T, mapper: (key: keyof T, value: T[keyof T]) => K): Record<K, T[keyof T]> {
  return mapObject(object, (value, key) => [mapper(key, value), value]);
}

export async function mapObjectValuesAsync<T extends ObjectLiteral, V>(object: T, mapper: (value: T[keyof T], key: keyof T) => Promise<V>): Promise<Record<keyof T, V>> {
  return await mapObjectAsync(object, async (value, key) => [key, await mapper(value, key)]);
}

export function filterObject<T extends ObjectLiteral, U extends T[keyof T]>(object: T, predicate: (value: T[keyof T], key: keyof T) => value is U): PickBy<T, U>;
export function filterObject<T extends ObjectLiteral>(object: T, predicate: (value: T[keyof T], key: keyof T) => boolean): Partial<T>;
export function filterObject<T extends ObjectLiteral>(object: T, predicate: (value: T[keyof T], key: keyof T) => boolean): Partial<T> {
  const mappedEntries = objectEntries(object).filter(([key, value]) => predicate(value, key));
  return Object.fromEntries(mappedEntries) as Partial<T>;
}

export async function filterObjectAsync<T extends ObjectLiteral>(object: T, predicate: (value: T[keyof T], key: keyof T) => Promise<boolean>): Promise<Partial<T>> {
  const entries = objectEntries(object);
  const mappedEntries = await toArrayAsync(filterAsync(entries, async ([key, value]) => await predicate(value, key)));
  return Object.fromEntries(mappedEntries) as Partial<T>;
}

export function filterUndefinedFromRecord<K extends PropertyKey, V>(record: Record<K, V>): Record<BaseType<K>, Exclude<V, undefined>> {
  return filterObject(record, isDefined) as any as Record<BaseType<K>, Exclude<V, undefined>>;
}

export function filterUndefinedObjectProperties<T extends ObjectLiteral>(object: T): SimplifyObject<Optionalize<T>> {
  return filterObject(object, isDefined) as T;
}

export function copyObjectProperties<T extends ObjectLiteral>(source: T, target: T): void {
  for (const key of objectKeys(source)) {
    target[key] = source[key] as any;
  }
}

export function getGetter<T extends ObjectLiteral, U extends keyof T>(obj: T, property: U, bind: boolean): () => T[U] {
  if (!(property in obj)) {
    throw new Error(`Property ${property as string} does not exist.`);
  }

  let objOrPrototype = obj as object;

  while (!hasOwnProperty<Record>(objOrPrototype, property)) {
    objOrPrototype = Object.getPrototypeOf(objOrPrototype) as object;
  }

  const descriptor = Object.getOwnPropertyDescriptor(objOrPrototype, property);

  if (descriptor == undefined) {
    throw new Error('Could not get property descriptor.');
  }

  if (descriptor.get == undefined) {
    throw new Error(`Property ${property as string} has no getter.`);
  }

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getter = bind ? descriptor.get.bind(obj) : descriptor.get;
  return getter;
}

export function deepObjectEntries(object: ObjectLiteral, keepInnerObjects: boolean = false, prefix?: string): [string, any][] {
  const allEntries = objectEntries(object) as [string, any][];

  for (const entry of allEntries) {
    if (isSymbol(entry[0])) {
      throw new Error('Deep entries does not support symbols.');
    }
  }

  const rawEntries = isUndefined(prefix)
    ? allEntries
    : allEntries.map(([key, value]) => [`${prefix}${key}`, value] as const);

  const entries: [string, any][] = [];

  for (const [key, value] of rawEntries) {
    if (isObject(value) || isArray(value)) {
      if (keepInnerObjects) {
        entries.push([key, value]);
      }

      const innerEntries = deepObjectEntries(value, keepInnerObjects, `${key}.`);
      entries.push(...innerEntries);
    }
    else {
      entries.push([key, value]);
    }
  }

  return entries;
}

export function fromDeepObjectEntries(entries: readonly (readonly [JsonPathInput, any])[]): ObjectLiteral {
  const obj: Record = {};

  for (const [path, value] of entries) {
    const jsonPath = JsonPath.from(path);

    let target = obj;

    for (let i = 0; i < jsonPath.nodes.length - 1; i++) {
      const key = jsonPath.nodes[i]!;

      if (hasOwnProperty(target, key)) {
        target = target[key];
      }
      else {
        const child = {};
        (target as Record)[key] = child;
        target = child;
      }
    }

    target[jsonPath.nodes.at(-1)!] = value;
  }

  return obj;
}

export function omit<T extends Record, K extends keyof T>(object: T, ...keys: K[]): SimplifyObject<Omit<T, K>> {
  return filterObject(object, (_, key) => !keys.includes(key as K)) as Omit<T, K>;
}

export function pick<T extends Record, K extends keyof T>(object: T, ...keys: K[]): SimplifyObject<Pick<T, K>> {
  return filterObject(object, (_, key) => keys.includes(key as K)) as Pick<T, K>;
}
