import { CancellationToken } from '#/cancellation/index.js';
import { Injector, Singleton, inject, runInInjectionContext } from '#/injector/index.js';
import { LockProvider } from '#/lock/index.js';
import { Logger } from '#/logger/index.js';
import { toArray } from '#/utils/array/array.js';
import { compareByValueSelectionDescending } from '#/utils/comparison.js';
import { round } from '#/utils/math.js';
import { Timer } from '#/utils/timer.js';
import { isDefined } from '#/utils/type-guards.js';
import { MigrationStateRepository } from './migration-state-repository.js';
import type { NewMigrationState } from './migration-state.js';

export type MigrationDefinition<T = void> = {
  name: string,
  migrations: Migration<T>[]
};

export type Migration<T = void> = {
  from: 'init' | number | number[],
  to: number,
  migrator: (control: MigrationControl) => Promise<T> | T
};

export type MigrationControl = {
  restart: () => void
};

export type MigrationResult<T> = {
  from: 'init' | number,
  to: number,
  time: number,
  result: T,
  restartRequested: boolean
};

@Singleton()
export class Migrator {
  readonly #injector = inject(Injector);
  readonly #migrationStateRepository = inject(MigrationStateRepository);
  readonly #lockProvider = inject(LockProvider, 'migrator:');
  readonly #logger = inject(Logger, 'Migrator');

  // eslint-disable-next-line max-statements, max-lines-per-function
  async migrate<T>({ name, migrations }: MigrationDefinition<T>): Promise<MigrationResult<T>[]> {
    if (migrations.length == 0) {
      throw new Error('No migrations provided.');
    }

    const lock = this.#lockProvider.get(`${name}`);

    // eslint-disable-next-line max-statements, max-lines-per-function
    const { result } = await lock.use(30000, true, async (): Promise<MigrationResult<T>[]> => {
      const results: MigrationResult<T>[] = [];

      while (true) {
        const restartToken = new CancellationToken();
        const control: MigrationControl = {
          restart: () => restartToken.set()
        };

        const currentState = await this.#migrationStateRepository.tryLoadByFilter({ name });
        const currentRevision = currentState?.revision ?? 'init';
        const latestRevision = migrations.sort(compareByValueSelectionDescending((migration) => migration.to))[0]!.to;

        if (currentRevision == latestRevision) {
          break;
        }

        const suitableMigrations = migrations.filter((migration) => toArray(migration.from).includes(currentRevision));

        if (suitableMigrations.length == 0) {
          throw new Error(`No suitable migration path from current revision ${currentRevision} to latest revision ${latestRevision} found.`);
        }

        const migration = suitableMigrations.sort(compareByValueSelectionDescending((m) => m.to))[0]!;

        this.#logger.warn(`Starting migration for "${name}" from revision ${currentRevision} to ${migration.to}.`);

        let migratorResult!: T;

        const time = await Timer.measureAsync(async () => (migratorResult = await runInInjectionContext(this.#injector, async () => migration.migrator(control))));

        results.push({ from: currentRevision, to: migration.to, time, result: migratorResult, restartRequested: restartToken.isSet });

        if (restartToken.isSet) {
          this.#logger.warn(`Finished migration in ${round(time / 1000, 2)} seconds.`);
          this.#logger.warn('Migration-restart requested.');
          continue;
        }

        if (isDefined(currentState)) {
          await this.#migrationStateRepository.patchByFilter({ name }, { revision: migration.to });
        }
        else {
          const newState: NewMigrationState = {
            name,
            revision: migration.to
          };

          await this.#migrationStateRepository.insert(newState);
        }

        this.#logger.warn(`Finished migration in ${round(time / 1000, 2)} seconds.`);
      }

      return results;
    });

    return result;
  }
}
