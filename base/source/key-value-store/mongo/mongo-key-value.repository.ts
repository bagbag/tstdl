import type { Injectable } from '#/container/index.js';
import { forwardArg, resolveArg, resolveArgumentType, singleton } from '#/container/index.js';
import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo/index.js';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo/index.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import { mongoKeyValueStoreModuleConfig } from './module.js';
import type { MongoKeyValue } from './mongo-key-value.model.js';

const indexes: TypedIndexDescription<MongoKeyValue>[] = [
  { key: { module: 1, key: 1 }, unique: true }
];

@singleton({ defaultArgumentProvider: () => mongoKeyValueStoreModuleConfig.defaultKeyValueRepositoryConfig })
export class MongoKeyValueRepository extends MongoEntityRepository<MongoKeyValue> implements Injectable<CollectionArgument<MongoKeyValue>> {
  readonly [resolveArgumentType]: CollectionArgument<MongoKeyValue, MongoKeyValue>;

  constructor(@forwardArg() collection: Collection<MongoKeyValue>, @resolveArg<LoggerArgument>(MongoKeyValueRepository.name) logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}
