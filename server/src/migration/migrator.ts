import type { LockProvider } from '@tstdl/base/lock';
import type { Logger } from '@tstdl/base/logger';
import { compareByValueSelectionDescending, isDefined, isUndefined, round, Timer, toArray } from '@tstdl/base/utils';
import type { NewMigrationState } from './migration-state';
import type { MigrationStateRepository } from './migration-state-repository';

export type MigrationDefinition = {
  name: string,
  migrations: Migration[]
};

export type Migration<T = void> = {
  from: 'init' | number | number[],
  to: number,
  migrator: () => Promise<T> | T
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

  // eslint-disable-next-line max-statements, max-lines-per-function
  async migrate({ name, migrations }: MigrationDefinition): Promise<void> {
    if (migrations.length == 0) {
      throw new Error('no migrations provided');
    }

    const lock = this.lockProvider.get(`migrator-${name}`);

    let hasLatest = false;

    await lock.using(30000, true, async () => {
      const currentState = await this.migrationStateRepository.tryLoadByFilter({ name });
      const currentRevision = currentState?.revision ?? 'init';
      const latestRevision = migrations.sort(compareByValueSelectionDescending((migration) => migration.to))[0].to;

      if (currentRevision == latestRevision) {
        hasLatest = true;
        return;
      }

      const suitableMigrations = migrations.filter((migration) => toArray(migration.from).includes(currentRevision));

      if (suitableMigrations.length == 0) {
        throw new Error(`no suitable migration path from current revision ${currentRevision} to latest revision ${latestRevision} found`);
      }

      const largestMigration = suitableMigrations.sort(compareByValueSelectionDescending((migration) => migration.to))[0];

      this.logger.warn(`starting migration for "${name}" from revision ${currentRevision} to ${largestMigration.to}`);

      const time = await Timer.measureAsync(async () => largestMigration.migrator());

      if (isDefined(currentState)) {
        await this.migrationStateRepository.patchByFilter({ name }, { revision: largestMigration.to });
      }
      else {
        const newState: NewMigrationState = {
          name,
          revision: largestMigration.to
        };

        await this.migrationStateRepository.insert(newState);
      }

      this.logger.warn(`finished migration in ${round(time / 1000, 2)} seconds`);
    });

    if (hasLatest) {
      return;
    }

    await this.migrate({ name, migrations });
  }
}
