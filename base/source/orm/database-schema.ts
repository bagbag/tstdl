import { getDrizzleTableFromType, type PgTableFromType } from './drizzle/schema-converter.js';
import type { EntityType } from './entity.js';

export class DatabaseSchema<Name extends string> {
  readonly name: Name;

  constructor(name: Name) {
    this.name = name;
  }

  getTable<T extends EntityType>(type: T): PgTableFromType<Name, T> {
    return getDrizzleTableFromType(this.name, type);
  }
}

export function databaseSchema<Name extends string>(name: Name): DatabaseSchema<Name> {
  return new DatabaseSchema(name);
}
