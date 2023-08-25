import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo/index.js';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo/index.js';
import { ForwardArg, ResolveArg, Singleton, resolveArgumentType } from '#/injector/index.js';
import type { Resolvable } from '#/injector/interfaces.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import type { MongoKeyValue } from './mongo-key-value.model.js';
import { DEFAULT_KEY_VALUE_REPOSITORY_CONFIG } from './tokens.js';

const indexes: TypedIndexDescription<MongoKeyValue>[] = [
  { key: { module: 1, key: 1 }, unique: true }
];

@Singleton({ defaultArgumentProvider: (context) => context.resolve(DEFAULT_KEY_VALUE_REPOSITORY_CONFIG) })
export class MongoKeyValueRepository extends MongoEntityRepository<MongoKeyValue> implements Resolvable<CollectionArgument<MongoKeyValue>> {
  declare readonly [resolveArgumentType]: CollectionArgument<MongoKeyValue, MongoKeyValue>;
  constructor(@ForwardArg() collection: Collection<MongoKeyValue>, @ResolveArg<LoggerArgument>('MongoKeyValueRepository') logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}
