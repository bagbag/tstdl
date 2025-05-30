/**
 * @module
 * Defines a custom Drizzle type for handling PostgreSQL `bytea` columns.
 */
import { customType, type ConvertCustomConfig, type PgCustomColumnBuilder } from 'drizzle-orm/pg-core';

type Config = { data: Uint8Array, driverData: Uint8Array };

/**
 * Custom Drizzle type for PostgreSQL `bytea` columns.
 * Maps between `Uint8Array` in JavaScript and `bytea` in the database.
 */
export const bytea = customType<Config>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Uint8Array): Uint8Array {
    return value;
  },
  fromDriver(value: Uint8Array): Uint8Array {
    return value;
  }
}) as {
  (): PgCustomColumnBuilder<ConvertCustomConfig<'', Config>>,
  <TName extends string>(dbName: TName): PgCustomColumnBuilder<ConvertCustomConfig<TName, Config>>
};
