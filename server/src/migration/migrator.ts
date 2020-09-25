import type { LockProvider } from '@tstdl/base/lock';
import type { Logger } from '@tstdl/base/logger';
import { compareByValueSelectionDescending, precisionRound, Timer, toArray } from '@tstdl/base/utils';
import type { MigrationStateRepository } from './migration-state-repository';

export type MigrationDefinition = {
  name: string,
  migrations: Migration[]
};

export type Migration = {
  from: number | number[],
  to: number,
  migrator: () => Promise<any>
};

export class Migrator {
  private readonly migrationStateRepository: MigrationStateRepository;
  private readonly lockProvider: LockProvider;
  private readonly logger: Logger;

  constructor(migrationStateRepository: MigrationStateRepository, lockProvider: LockProvider, logger: Logger) {
    this.migrationStateRepository = migrationStateRepository;
    this.lockProvider = lockProvider;
    this.logger = logger;
  }

  // eslint-disable-next-line max-statements
  async migrate({ name, migrations }: MigrationDefinition): Promise<void> {
    if (migrations.length == 0) {
      throw new Error('no migrations provided');
    }

    const lock = this.lockProvider.get(`migrator-${name}`);
    const lockResult = await lock.acquire(30000, false);

    if (lockResult == false) {
      throw new Error('failed to acquire lock for migration');
    }

    try {
      const currentState = await this.migrationStateRepository.loadByName(name);
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

      this.logger.warn(`starting migration for "${name}" from revision ${currentRevision} to ${largestMigration.to}`);

      const time = await Timer.measureAsync(async () => largestMigration.migrator());
      await this.migrationStateRepository.setRevision(name, largestMigration.to);

      this.logger.warn(`finished migration in ${precisionRound(time / 1000, 2)} seconds`);
    }
    finally {
      await lockResult.release();
    }

    await this.migrate({ name, migrations });
  }
}
