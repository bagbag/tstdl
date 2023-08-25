import type { Resolvable } from '#/injector/index.js';
import { ForwardArg, ResolveArg, Singleton, resolveArgumentType } from '#/injector/index.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import type { MigrationState, MigrationStateRepository } from '#/migration/index.js';
import type { CollectionArgument } from '../../database/mongo/classes.js';
import { Collection } from '../../database/mongo/classes.js';
import { MongoEntityRepository, noopTransformer } from '../../database/mongo/mongo-entity-repository.js';
import type { TypedIndexDescription } from '../../database/mongo/types.js';
import { mongoMigrationStateRepositoryModuleConfig } from './module.js';

const indexes: TypedIndexDescription<MigrationState>[] = [
  { key: { name: 1 }, unique: true }
];

@Singleton({ defaultArgumentProvider: () => mongoMigrationStateRepositoryModuleConfig.defaultMigrationStateRepositoryConfig })
export class MongoMigrationStateRepository extends MongoEntityRepository<MigrationState> implements MigrationStateRepository, Resolvable<CollectionArgument<MigrationState>> {
  declare readonly [resolveArgumentType]: CollectionArgument<MigrationState>;
  constructor(@ForwardArg() collection: Collection<MigrationState>, @ResolveArg<LoggerArgument>('MongoMigrationStateRepository') logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}
