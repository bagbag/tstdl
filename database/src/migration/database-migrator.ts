import { LockProvider } from '@tstdl/base/lock';
import { Logger } from '@tstdl/base/logger';
import { compareByValueSelectionDescending, precisionRound, Timer, toArray } from '@tstdl/base/utils';
import { DatabaseMigrationStateRepository } from './database-migration-state-repository';

export type DatabaseMigrationDefinition = {
  name: string,
  migrations: DatabaseMigration[]
};

export type DatabaseMigration = {
  from: number | number[],
  to: number,
  migrator: () => Promise<any>
};

export class DatabaseMigrator {
  private readonly databaseMigrationStateRepository: DatabaseMigrationStateRepository;
  private readonly lockProvider: LockProvider;
  private readonly logger: Logger;

  constructor(databaseMigrationStateRepository: DatabaseMigrationStateRepository, lockProvider: LockProvider, logger: Logger) {
    this.databaseMigrationStateRepository = databaseMigrationStateRepository;
    this.lockProvider = lockProvider;
    this.logger = logger;
  }

  // eslint-disable-next-line max-statements
  async migrate({ name, migrations }: DatabaseMigrationDefinition): Promise<void> {
    if (migrations.length == 0) {
      throw new Error('no migrations provided');
    }

    const lock = this.lockProvider.get(`database-migrator-${name}`);
    const lockResult = await lock.acquire(30000);

    if (lockResult == false) {
      throw new Error('failed to acquire lock for database-migration');
    }

    try {
      const currentState = await this.databaseMigrationStateRepository.loadByName(name);
      const currentRevision = currentState?.revision ?? 0;
      const highestRevision = migrations.sort(compareByValueSelectionDescending((migration) => migration.to))[0].to;

      if (currentRevision == highestRevision) {
        return;
      }

      const suitableMigrations = migrations.filter((migration) => toArray(migration.from).includes(currentRevision));

      if (suitableMigrations.length == 0) {
        throw new Error(`no suitable migration path from current revision ${currentRevision} to latest revision ${highestRevision} found`);
      }

      const largestMigration = suitableMigrations.sort(compareByValueSelectionDescending((migration) => migration.to))[0];

      this.logger.warn(`starting database migration for ${name} from revision ${currentRevision} to ${largestMigration.to}`);

      const time = await Timer.measureAsync(async () => largestMigration.migrator());
      await this.databaseMigrationStateRepository.setRevision(name, largestMigration.to);

      this.logger.warn(`finished migration in ${precisionRound(time / 1000, 2)} seconds`);
    }
    finally {
      await lockResult.release();
    }

    await this.migrate({ name, migrations });
  }
}
