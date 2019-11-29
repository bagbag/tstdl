import { DatabaseMigrationState, DatabaseMigrationStateRepository } from '@tstdl/database/migration/';
import { MongoEntityRepository } from '../mongo-entity-repository';
import { Collection, TypedIndexSpecification } from '../types';

const indexes: TypedIndexSpecification<DatabaseMigrationState>[] = [
  { key: { name: 1 }, unique: true }
];

export class MongoDatabaseMigrationStateRepository extends MongoEntityRepository<DatabaseMigrationState> implements DatabaseMigrationStateRepository {
  constructor(collection: Collection<DatabaseMigrationState>) {
    super(collection, { indexes });
  }

  async loadByName(name: string): Promise<DatabaseMigrationState | undefined> {
    return this.baseRepository.loadByFilter({ name }, false);
  }

  async setRevision(name: string, revision: number): Promise<void> {
    const has = await this.baseRepository.hasByFilter({ name });

    if (has) {
      await this.baseRepository.update({ name }, { $set: { revision } });
    }
    else {
      await this.save({ name, revision });
    }
  }
}
