import type { Tagged } from 'type-fest';

import type { EnumerationObject, SimplifyObject } from '#/types.js';
import { isUndefined } from '#/utils/type-guards.js';

const registry = new WeakMap<object, string>();

export type EnumType<T extends EnumerationObject> = T[keyof T];

export function defineEnum<const Name extends string, const T extends EnumerationObject>(name: Name, enumObject: T): SimplifyObject<{ [P in keyof T]: Tagged<T[P], Name> }> {
  registry.set(enumObject, name);
  return enumObject as { [P in keyof T]: Tagged<T[P], Name> };
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
