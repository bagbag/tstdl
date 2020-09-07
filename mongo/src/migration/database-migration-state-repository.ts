import type { Logger } from '@tstdl/base/logger';
import type { DatabaseMigrationState, DatabaseMigrationStateRepository } from '@tstdl/database/migration/';
import { MongoEntityRepository, noopTransformer } from '../entity-repository';
import { getNewDocumentId } from '../id';
import type { Collection, TypedIndexSpecification } from '../types';

const indexes: TypedIndexSpecification<DatabaseMigrationState>[] = [
  { key: { name: 1 }, unique: true }
];

export class MongoDatabaseMigrationStateRepository extends MongoEntityRepository<DatabaseMigrationState> implements DatabaseMigrationStateRepository {
  constructor(collection: Collection<DatabaseMigrationState>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }

  async loadByName(name: string): Promise<DatabaseMigrationState | undefined> {
    return this.baseRepository.tryLoadByFilter({ name });
  }

  async setRevision(name: string, revision: number): Promise<void> {
    await this.baseRepository.update(
      { name },
      {
        $set: { revision },
        $setOnInsert: { _id: getNewDocumentId() }
      },
      { upsert: true }
    );
  }
}
