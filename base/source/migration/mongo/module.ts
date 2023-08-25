import type { MongoRepositoryConfig } from '#/database/mongo/index.js';
import { Injector } from '#/injector/injector.js';
import { MigrationStateRepository } from '#/migration/migration-state-repository.js';
import type { MigrationState } from '#/migration/migration-state.js';
import { MongoMigrationStateRepository } from './migration-state-repository.js';

export type MongoMigrationStateRepositoryModuleConfig = {
  defaultMigrationStateRepositoryConfig: MongoRepositoryConfig<MigrationState> | undefined
};

export const mongoMigrationStateRepositoryModuleConfig: MongoMigrationStateRepositoryModuleConfig = {
  defaultMigrationStateRepositoryConfig: undefined
};

/**
 * configure mongo migration state repository module
 * @param migrationStateRepositoryConfig repository configuration for states
 * @param register whether to register for {@link MigrationStateRepository}
 */
export function configureMongoMigrationStateRepository(migrationStateRepositoryConfig: MongoRepositoryConfig<MigrationState>, register: boolean = true): void {
  mongoMigrationStateRepositoryModuleConfig.defaultMigrationStateRepositoryConfig = migrationStateRepositoryConfig;

  if (register) {
    Injector.registerSingleton(MigrationStateRepository, { useToken: MongoMigrationStateRepository });
  }
}
