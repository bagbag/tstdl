import type { PoolConfig } from 'pg';

import { Injector } from '#/injector/injector.js';
import { isDefined } from '#/utils/type-guards.js';
import { EntityRepositoryConfig } from './repository.js';
import { ENCRYPTION_SECRET } from './tokens.js';

export class DatabaseConfig {
  connection?: string | PoolConfig;
}

export type OrmModuleOptions = {
  connection?: string | PoolConfig,
  repositoryConfig?: EntityRepositoryConfig
};

export function configureOrm(options: OrmModuleOptions & { encryptionSecret?: Uint8Array }): void {
  if (isDefined(options.connection)) {
    Injector.register(DatabaseConfig, { useValue: { connection: options.connection } });
  }

  if (isDefined(options.repositoryConfig)) {
    Injector.register(EntityRepositoryConfig, { useValue: options.repositoryConfig });
  }

  if (isDefined(options.encryptionSecret)) {
    Injector.register(ENCRYPTION_SECRET, { useValue: options.encryptionSecret });
  }
}
