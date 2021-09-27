import type { Logger } from '#/logger';
import type { MongoKeyValue } from './model';
import { MongoEntityRepository, noopTransformer } from './mongo-entity-repository';
import type { Collection, TypedIndexDescription } from './types';

const indexes: TypedIndexDescription<MongoKeyValue>[] = [
  { name: 'scope_key', key: { scope: 1, key: 1 }, unique: true }
];

export class MongoKeyValueRepository extends MongoEntityRepository<MongoKeyValue> {
  constructor(collection: Collection<MongoKeyValue>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}
