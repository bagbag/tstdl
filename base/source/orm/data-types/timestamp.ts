/**
 * @module
 * Defines a custom Drizzle type for handling PostgreSQL `timestamp with time zone` columns
 * using numeric representation (Unix timestamp in milliseconds).
 */
import { customType, type ConvertCustomConfig, type PgCustomColumnBuilder } from 'drizzle-orm/pg-core';

type Config = { data: number, driverData: string };

/**
 * Custom Drizzle type for PostgreSQL `timestamp with time zone` columns, storing timestamps as numeric values (Unix timestamp in milliseconds).
 * Converts between JavaScript `number` (milliseconds since epoch) and database `timestamp with time zone` (ISO string).
 */
export const timestamp = customType<Config>({
  dataType() {
    return 'timestamp with time zone';
  },
  toDriver(value: number): string {
    return new Date(value).toISOString();
  },
  fromDriver(value: string): number {
    return new Date(value).getTime();
  }
}) as {
  (): PgCustomColumnBuilder<ConvertCustomConfig<'', Config>>,
  <TName extends string>(dbName: TName): PgCustomColumnBuilder<ConvertCustomConfig<TName, Config>>
};
