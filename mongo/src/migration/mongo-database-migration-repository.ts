import { DatabaseMigrationState, DatabaseMigrationStateRepository } from '@tstdl/database/migration/';
import { MongoEntityRepository } from '../mongo-entity-repository';
import { Collection, TypedIndexSpecification } from '../types';

const indexes: TypedIndexSpecification<DatabaseMigrationState>[] = [
  { key: { entity: 1 }, unique: true }
];

export class MongoDatabaseMigrationStateRepository extends MongoEntityRepository<DatabaseMigrationState> implements DatabaseMigrationStateRepository {
  constructor(collection: Collection<DatabaseMigrationState>) {
    super(collection, { indexes });
  }

  async loadByEntity(entity: string): Promise<DatabaseMigrationState | undefined> {
    return this.baseRepository.loadByFilter({ entity }, false);
  }

  async setRevision(entity: string, revision: number): Promise<void> {
    await this.baseRepository.update({ entity }, { revision });
  }
}
