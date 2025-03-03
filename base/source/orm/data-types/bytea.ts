import { customType, type ConvertCustomConfig, type PgCustomColumnBuilder } from 'drizzle-orm/pg-core';

type Config = { data: Uint8Array, driverData: Uint8Array };

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
