import { compareByValueSelectionDescending } from '@tstdl/base/utils';
import { DatabaseMigrationStateRepository } from './database-migration-state-repository';
import { Logger } from '@tstdl/base/logger';

export type DatabaseMigrationDefinition = {
  entity: string,
  migrations: DatabaseMigration[]
}

export type DatabaseMigration = {
  from: number,
  to: number,
  migrator: () => Promise<void>;
}

export class DatabaseMigrator {
  private readonly databaseMigrationStateRepository: DatabaseMigrationStateRepository;
  private readonly logger: Logger;

  constructor(databaseMigrationStateRepository: DatabaseMigrationStateRepository, logger: Logger) {
    this.databaseMigrationStateRepository = databaseMigrationStateRepository;
    this.logger = logger;
  }

  async migrate({ entity, migrations }: DatabaseMigrationDefinition): Promise<void> {
    if (migrations.length == 0) {
      throw new Error('no migrations provided');
    }

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

    this.logger.warn(`migration database for entity ${entity} from revision ${currentRevision} to ${largestMigration.to}`);

    await largestMigration.migrator();
    await this.databaseMigrationStateRepository.setRevision(entity, largestMigration.to);
    await this.migrate({ entity, migrations });
  }
}
