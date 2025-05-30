/**
 * @module
 * Defines a custom Drizzle type for handling PostgreSQL `date` columns
 * using numeric representation (YYYYMMDD).
 */
import { customType, type ConvertCustomConfig, type PgCustomColumnBuilder } from 'drizzle-orm/pg-core';

import { dateToNumericDate, numericDateToDate } from '#/utils/date-time.js';

type Config = { data: number, driverData: string };

/**
 * Custom Drizzle type for PostgreSQL `date` columns, storing dates as numeric values (YYYYMMDD).
 * Converts between JavaScript `number` (YYYYMMDD) and database `date` (ISO string).
 */
export const numericDate = customType<Config>({
  dataType() {
    return 'date';
  },
  toDriver(value: number): string {
    return numericDateToDate(value).toISOString();
  },
  fromDriver(value: string): number {
    const date = new Date(value);
    return dateToNumericDate(date);
  }
}) as {
  (): PgCustomColumnBuilder<ConvertCustomConfig<'', Config>>,
  <TName extends string>(dbName: TName): PgCustomColumnBuilder<ConvertCustomConfig<TName, Config>>
};
