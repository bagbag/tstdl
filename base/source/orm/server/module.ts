/**
 * @module
 * Provides configuration options and setup for the ORM module.
 * Allows configuring database connection, repository settings, and encryption secrets
 * via dependency injection.
 */
import type { PoolConfig } from 'pg';

import { Injector } from '#/injector/injector.js';
import { isDefined } from '#/utils/type-guards.js';
import { EntityRepositoryConfig } from './repository.js';
import { ENCRYPTION_SECRET } from './tokens.js';

/**
 * Configuration class for the database connection.
 */
export class DatabaseConfig {
  connection?: PoolConfig;
}

/**
 * Options for configuring the ORM module using `configureOrm`.
 */
export type OrmModuleOptions = {
  connection?: PoolConfig,
  repositoryConfig?: EntityRepositoryConfig,
};

/**
 * Configures the ORM module by registering necessary providers in the dependency injector.
 * @param options - Configuration options including connection details, repository settings, and the encryption secret.
 */
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
