import type { Injectable } from '#/container';
import { forwardArg, resolveArg, resolveArgumentType, singleton } from '#/container';
import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import { mongoKeyValueStoreModuleConfig } from './module';
import type { MongoKeyValue } from './mongo-key-value.model';

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
