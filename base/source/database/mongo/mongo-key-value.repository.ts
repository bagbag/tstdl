import type { Logger } from '#/logger';
import type { Collection } from './classes';
import type { MongoKeyValue } from './model';
import { MongoEntityRepository, noopTransformer } from './mongo-entity-repository';
import type { TypedIndexDescription } from './types';

const indexes: TypedIndexDescription<MongoKeyValue>[] = [
  { key: { scope: 1, key: 1 }, unique: true }
];

export class MongoKeyValueRepository extends MongoEntityRepository<MongoKeyValue> {
  constructor(collection: Collection<MongoKeyValue>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}
