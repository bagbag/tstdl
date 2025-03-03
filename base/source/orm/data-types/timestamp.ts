import { customType, type ConvertCustomConfig, type PgCustomColumnBuilder } from 'drizzle-orm/pg-core';

type Config = { data: number, driverData: string };

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
