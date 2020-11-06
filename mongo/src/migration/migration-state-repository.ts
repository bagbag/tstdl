import type { Logger } from '@tstdl/base/logger';
import type { MigrationState, MigrationStateRepository } from '@tstdl/server/migration/';
import { MongoEntityRepository, noopTransformer } from '../entity-repository';
import type { Collection, TypedIndexSpecification } from '../types';

const indexes: TypedIndexSpecification<MigrationState>[] = [
  { name: 'name', key: { name: 1 }, unique: true }
];

export class MongoMigrationStateRepository extends MongoEntityRepository<MigrationState> implements MigrationStateRepository {
  constructor(collection: Collection<MigrationState>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes, entityName: 'migration-state' });
  }
}
