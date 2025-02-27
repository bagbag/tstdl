import { inject } from '#/injector/index.js';
import { Injector } from '#/injector/injector.js';
import { Database, migrate, type DatabaseConfig } from '#/orm/server/index.js';
import { QueueProvider } from '../provider.js';
import { Queue } from '../queue.js';
import { PostgresQueue } from './queue.js';
import { PostgresQueueProvider } from './queue.provider.js';

export class PostgresQueueModuleConfig {
  database?: DatabaseConfig;
}

/**
 * configure mail module
 */
export function configurePostgresQueue(config: PostgresQueueModuleConfig, register: boolean = true): void {
  Injector.register(PostgresQueueModuleConfig, { useValue: config });

  if (register) {
    Injector.registerSingleton(QueueProvider, { useToken: PostgresQueueProvider });
    Injector.registerSingleton(Queue, { useToken: PostgresQueue });
  }
}

export async function migratePostgresQueueSchema(): Promise<void> {
  const connection = inject(PostgresQueueModuleConfig, undefined, { optional: true })?.database?.connection;
  const database = inject(Database, connection);

  await migrate(database, {
    migrationsSchema: 'queue',
    migrationsTable: '_migrations',
    migrationsFolder: import.meta.resolve('./drizzle').replace('file://', '')
  });
}
