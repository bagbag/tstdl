import type { Logger } from '@tstdl/base/logger';
import type { MigrationState, MigrationStateRepository } from '@tstdl/server/migration/';
import { MongoEntityRepository, noopTransformer } from '../entity-repository';
import { getNewDocumentId } from '../id';
import type { Collection, TypedIndexSpecification } from '../types';

const indexes: TypedIndexSpecification<MigrationState>[] = [
  { key: { name: 1 }, unique: true }
];

export class MongoMigrationStateRepository extends MongoEntityRepository<MigrationState> implements MigrationStateRepository {
  constructor(collection: Collection<MigrationState>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }

  async loadByName(name: string): Promise<MigrationState | undefined> {
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
