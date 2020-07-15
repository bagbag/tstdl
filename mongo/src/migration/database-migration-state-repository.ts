import { DatabaseMigrationState, DatabaseMigrationStateRepository } from '@tstdl/database/migration/';
import { MongoEntityRepository } from '../entity-repository';
import { getNewDocumentId } from '../id';
import { Collection, TypedIndexSpecification } from '../types';

const indexes: TypedIndexSpecification<DatabaseMigrationState>[] = [
  { key: { name: 1 }, unique: true }
];

export class MongoDatabaseMigrationStateRepository extends MongoEntityRepository<DatabaseMigrationState> implements DatabaseMigrationStateRepository {
  constructor(collection: Collection<DatabaseMigrationState>) {
    super(collection, { indexes });
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
      }
    );
  }
}
