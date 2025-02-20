import type { PgEnum } from 'drizzle-orm/pg-core';

import type { Enumeration, EnumerationValue, UnionToTuple } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
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

  getEnum<T extends Enumeration>(enumeration: T, name?: string): PgEnum<UnionToTuple<`${EnumerationValue<T>}`> extends [string, ...string[]] ? UnionToTuple<`${EnumerationValue<T>}`> : never> {
    if (isDefined(name)) {
      registerEnum(enumeration, name);
    }

    return getPgEnum(this.name, enumeration) as PgEnum<any>; // eslint-disable-line @typescript-eslint/no-unsafe-return
  }
}

export function databaseSchema<Name extends string>(name: Name): DatabaseSchema<Name> {
  return new DatabaseSchema(name);
}
