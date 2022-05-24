import { container } from '#/container';
import type { MongoRepositoryConfig } from '#/database/mongo';
import type { MigrationState } from '#/migration';
import { MigrationStateRepository } from '#/migration';
import { MongoMigrationStateRepository } from './migration-state-repository';

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
    container.registerSingleton(MigrationStateRepository, { useToken: MongoMigrationStateRepository });
  }
}
