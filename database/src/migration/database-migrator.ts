import { LockProvider } from '@tstdl/base/lock';
import { Logger } from '@tstdl/base/logger';
import { compareByValueSelectionDescending, precisionRound, Timer } from '@tstdl/base/utils';
import { DatabaseMigrationStateRepository } from './database-migration-state-repository';

export type DatabaseMigrationDefinition = {
  entity: string,
  migrations: DatabaseMigration[]
}

export type DatabaseMigration = {
  from: number,
  to: number,
  migrator: () => Promise<any>;
}

export class DatabaseMigrator {
  private readonly databaseMigrationStateRepository: DatabaseMigrationStateRepository;
  private readonly lockProvider: LockProvider;
  private readonly logger: Logger;

  constructor(databaseMigrationStateRepository: DatabaseMigrationStateRepository, lockProvider: LockProvider, logger: Logger) {
    this.databaseMigrationStateRepository = databaseMigrationStateRepository;
    this.lockProvider = lockProvider;
    this.logger = logger;
  }

  async migrate({ entity, migrations }: DatabaseMigrationDefinition): Promise<void> {
    if (migrations.length == 0) {
      throw new Error('no migrations provided');
    }

    const lock = this.lockProvider.get(`database-migrator-${entity}`);

    const result = await lock.acquire(30000, async () => {
      const currentState = await this.databaseMigrationStateRepository.loadByEntity(entity);
      const currentRevision = currentState == undefined ? 0 : currentState.revision;
      const highestRevision = migrations.sort(compareByValueSelectionDescending((migration) => migration.to))[0].to;

      if (currentRevision == highestRevision) {
        return;
      }

      const suitableMigrations = migrations.filter((migration) => migration.from == currentRevision);

      if (suitableMigrations.length == 0) {
        throw new Error(`no suitable migration path from current revision ${currentRevision} to latest revision ${highestRevision} found`);
      }

      const largestMigration = suitableMigrations.sort(compareByValueSelectionDescending((migration) => migration.to))[0];

      this.logger.warn(`starting database migration for entity ${entity} from revision ${currentRevision} to ${largestMigration.to}`);

      const time = await Timer.measureAsync(async () => largestMigration.migrator());

      this.logger.warn(`finished migration for entity ${entity} in ${precisionRound(time / 1000, 2)} seconds`);

      await this.databaseMigrationStateRepository.setRevision(entity, largestMigration.to);
    });

    if (result == false) {
      throw new Error('failed to acquire lock for database-migration');
    }

    await this.migrate({ entity, migrations });
  }
}
