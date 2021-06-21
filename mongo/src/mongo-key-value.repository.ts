import type { Logger } from '@tstdl/base/logger';
import type { MongoKeyValue } from './model';
import { MongoEntityRepository, noopTransformer } from './mongo-entity-repository';
import type { Collection, TypedIndexSpecification } from './types';

const indexes: TypedIndexSpecification<MongoKeyValue>[] = [
  { name: 'scope_key', key: { scope: 1, key: 1 }, unique: true }
];

export class MongoKeyValueRepository extends MongoEntityRepository<MongoKeyValue> {
  constructor(collection: Collection<MongoKeyValue>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes, entityName: 'key-value' });
  }
}
