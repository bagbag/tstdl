import { inject } from '#/injector/index.js';
import { Injector } from '#/injector/injector.js';
import { Database, migrate, type DatabaseConfig } from '#/orm/server/index.js';
import type { Type } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import { MailClient, MailClientConfig } from './mail.client.js';
import type { DefaultMailData } from './models/index.js';
import { MAIL_DEFAULT_DATA } from './tokens.js';

export class MailModuleConfig {
  database?: DatabaseConfig;
  defaultClientConfig?: MailClientConfig;
  client?: Type<MailClient>;
  defaultData?: DefaultMailData;
}

/**
 * configure mail module
 */
export function configureMail(config: MailModuleConfig): void {
  Injector.register(MailModuleConfig, { useValue: config });

  if (isDefined(config.defaultClientConfig)) {
    Injector.registerSingleton(MailClientConfig, { useValue: config.defaultClientConfig });
  }

  if (isDefined(config.client)) {
    Injector.registerSingleton(MailClient, { useToken: config.client });
  }

  if (isDefined(config.defaultData)) {
    Injector.registerSingleton(MAIL_DEFAULT_DATA, { useValue: config.defaultData });
  }
}

export async function migrateMailSchema(): Promise<void> {
  const connection = inject(MailModuleConfig, undefined, { optional: true })?.database?.connection;
  const database = inject(Database, connection);

  await migrate(
    database,
    {
      migrationsSchema: 'mail',
      migrationsTable: '_migrations',
      migrationsFolder: import.meta.resolve('./drizzle').replace('file://', '')
    }
  );
}
