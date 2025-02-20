import { customType, type ConvertCustomConfig, type PgCustomColumnBuilder } from 'drizzle-orm/pg-core';

import { dateToNumericDate, numericDateToDate } from '#/utils/date-time.js';

type Config = { data: number, driverData: string };

export const numericDate = customType<Config>({
  dataType() {
    return 'date';
  },
  toDriver(value: number): string {
    const { year, month, day } = numericDateToDate(value);
    return new Date(year, month - 1, day).toISOString();
  },
  fromDriver(value: string): number {
    const date = new Date(value);
    return dateToNumericDate(date);
  }
}) as {
  (): PgCustomColumnBuilder<ConvertCustomConfig<'', Config>>,
  <TName extends string>(dbName: TName): PgCustomColumnBuilder<ConvertCustomConfig<TName, Config>>
};
