import { customType, type ConvertCustomConfig, type PgCustomColumnBuilder } from 'drizzle-orm/pg-core';

import { dateToNumericDate, numericDateToDate } from '#/utils/date-time.js';

type Config = { data: number, driverData: string };

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
