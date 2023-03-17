import type { Injectable } from '#/container/index.js';
import { forwardArg, resolveArg, singleton, type resolveArgumentType } from '#/container/index.js';
import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo/index.js';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo/index.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import type { MongoKeyValue } from './mongo-key-value.model.js';
import { DEFAULT_KEY_VALUE_REPOSITORY_CONFIG } from './tokens.js';

const indexes: TypedIndexDescription<MongoKeyValue>[] = [
  { key: { module: 1, key: 1 }, unique: true }
];

@singleton({ defaultArgumentProvider: (context) => context.resolve(DEFAULT_KEY_VALUE_REPOSITORY_CONFIG) })
export class MongoKeyValueRepository extends MongoEntityRepository<MongoKeyValue> implements Injectable<CollectionArgument<MongoKeyValue>> {
  declare readonly [resolveArgumentType]: CollectionArgument<MongoKeyValue, MongoKeyValue>;
  constructor(@forwardArg() collection: Collection<MongoKeyValue>, @resolveArg<LoggerArgument>(MongoKeyValueRepository.name) logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}
