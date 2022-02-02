import type { Logger } from '#/logger';
import type { MigrationState, MigrationStateRepository } from '#/migration/';
import type { Collection } from '../classes';
import { MongoEntityRepository, noopTransformer } from '../mongo-entity-repository';
import type { TypedIndexDescription } from '../types';

const indexes: TypedIndexDescription<MigrationState>[] = [
  { key: { name: 1 }, unique: true }
];

export class MongoMigrationStateRepository extends MongoEntityRepository<MigrationState> implements MigrationStateRepository {
  constructor(collection: Collection<MigrationState>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}
