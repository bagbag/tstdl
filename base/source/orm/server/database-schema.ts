import type { PgEnum } from 'drizzle-orm/pg-core';

import { getEnumName } from '#/enumeration/enumeration.js';
import type { Enumeration, EnumerationObject, EnumerationValue, UnionToTuple } from '#/types.js';
import type { EntityType } from '../entity.js';
import { getDrizzleTableFromType, getPgEnum, registerEnum } from './drizzle/schema-converter.js';
import type { PgTableFromType } from './types.js';

export class DatabaseSchema<Name extends string> {
  readonly name: Name;

  constructor(name: Name) {
    this.name = name;
  }

  getTable<T extends EntityType>(type: T): PgTableFromType<Name, T> {
    return getDrizzleTableFromType(type, this.name);
  }

  getEnum<T extends Enumeration>(enumeration: T, name: string = getEnumName(enumeration as EnumerationObject)): PgEnum<UnionToTuple<`${EnumerationValue<T>}`> extends [string, ...string[]] ? UnionToTuple<`${EnumerationValue<T>}`> : never> {
    registerEnum(enumeration, name);
    return getPgEnum(this.name, enumeration) as any; // eslint-disable-line @typescript-eslint/no-unsafe-return
  }
}

export function databaseSchema<Name extends string>(name: Name): DatabaseSchema<Name> {
  return new DatabaseSchema(name);
}
