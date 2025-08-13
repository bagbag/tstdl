
import type { EnumerationObject } from '#/types/index.js';
import { isUndefined } from '#/utils/type-guards.js';

const registry = new WeakMap<object, string>();

export type EnumType<T extends EnumerationObject> = T[keyof T];

export function defineEnum<const T extends EnumerationObject>(name: string, enumObject: T): T {
  registry.set(enumObject, name);
  return enumObject;
}

export function tryGetEnumName(enumeration: EnumerationObject): string | undefined {
  return registry.get(enumeration);
}

export function getEnumName(enumeration: EnumerationObject): string {
  const name = tryGetEnumName(enumeration);

  if (isUndefined(name)) {
    throw new Error('Unknown enumeration');
  }

  return name;
}
