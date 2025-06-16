import { inject, Injector } from '#/injector/index.js';
import { Database, migrate, type DatabaseConfig } from '#/orm/server/index.js';
import { isDefined } from '#/utils/type-guards.js';
import { KeyValueStore } from '../key-value.store.js';
import { PostgresKeyValueStore } from './key-value-store.service.js';

export class PostgresKeyValueStoreModuleConfig {
  database?: DatabaseConfig;
}

export function configurePostgresKeyValueStore(config?: PostgresKeyValueStoreModuleConfig): void {
  if (isDefined(config)) {
    Injector.register(PostgresKeyValueStoreModuleConfig, { useValue: config });
  }

  Injector.registerSingleton(KeyValueStore, { useToken: PostgresKeyValueStore });
}

export async function migratePostgresKeyValueStoreSchema(): Promise<void> {
  const connection = inject(PostgresKeyValueStoreModuleConfig, undefined, { optional: true })?.database?.connection;
  const database = inject(Database, connection);

  await migrate(
    database,
    {
      migrationsSchema: 'key_value_store',
      migrationsTable: '_migrations',
      migrationsFolder: import.meta.resolve('./drizzle').replace('file://', ''),
    }
  );
}
