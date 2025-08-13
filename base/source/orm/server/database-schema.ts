/**
 * @module
 * Provides utilities for defining and accessing database schemas, tables, and enums
 * within a specific PostgreSQL schema.
 */
import type { PgEnum } from 'drizzle-orm/pg-core';

import type { Enumeration, EnumerationValue, UnionToTuple } from '#/types/index.js';
import { isDefined } from '#/utils/type-guards.js';
import type { EntityType } from '../entity.js';
import { getDrizzleTableFromType, getPgEnum, registerEnum } from './drizzle/schema-converter.js';
import type { PgTableFromType } from './types.js';

/**
 * Represents a database schema, providing methods to access tables and enums within that schema.
 * @template SchemaName The name of the PostgreSQL schema.
 */
export class DatabaseSchema<SchemaName extends string> {
  /** The name of the PostgreSQL schema. */
  readonly name: SchemaName;

  /**
   * Creates an instance of DatabaseSchema.
   * @param name The name of the PostgreSQL schema.
   */
  constructor(name: SchemaName) {
    this.name = name;
  }

  /**
   * Gets the Drizzle table object corresponding to the given entity type within this schema.
   * @template T The entity type.
   * @param type The entity class.
   * @returns The Drizzle table object.
   */
  getTable<T extends EntityType>(type: T): PgTableFromType<T, SchemaName> {
    return getDrizzleTableFromType(type, this.name);
  }

  /**
   * Gets the Drizzle enum object corresponding to the given enumeration within this schema.
   * If a name is provided, it registers the enum with that name first.
   * @template T The enumeration type.
   * @param enumeration The enumeration object.
   * @param name Optional name to register the enum with.
   * @returns The Drizzle enum object.
   */
  getEnum<T extends Enumeration>(enumeration: T, name?: string): PgEnum<UnionToTuple<`${EnumerationValue<T>}`> extends [string, ...string[]] ? UnionToTuple<`${EnumerationValue<T>}`> : never> {
    if (isDefined(name)) {
      registerEnum(enumeration, name);
    }

    return getPgEnum(this.name, enumeration) as PgEnum<any>; // eslint-disable-line @typescript-eslint/no-unsafe-return
  }
}

/**
 * Factory function to create a DatabaseSchema instance.
 * @template Name The name of the PostgreSQL schema.
 * @param name The name of the PostgreSQL schema.
 * @returns A new DatabaseSchema instance.
 */
export function databaseSchema<Name extends string>(name: Name): DatabaseSchema<Name> {
  return new DatabaseSchema(name);
}
