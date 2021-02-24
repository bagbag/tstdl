import type { Logger } from '@tstdl/base/logger';
import { MongoEntityRepository, noopTransformer } from './entity-repository';
import type { MongoKeyValue } from './model';
import type { Collection, TypedIndexSpecification } from './types';

const indexes: TypedIndexSpecification<MongoKeyValue>[] = [
  { name: 'scope_key', key: { scope: 1, key: 1 }, unique: true }
];

export class MongoKeyValueRepository extends MongoEntityRepository<MongoKeyValue> {
  constructor(collection: Collection<MongoKeyValue>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes, entityName: 'key-value' });
  }
}
