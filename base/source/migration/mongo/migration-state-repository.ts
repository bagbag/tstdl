import type { Injectable } from '#/container';
import { forwardArg, resolveArg, resolveArgumentType, singleton } from '#/container';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import type { MigrationState, MigrationStateRepository } from '#/migration/';
import type { CollectionArgument } from '../../database/mongo/classes';
import { Collection } from '../../database/mongo/classes';
import { MongoEntityRepository, noopTransformer } from '../../database/mongo/mongo-entity-repository';
import type { TypedIndexDescription } from '../../database/mongo/types';
import { mongoMigrationStateRepositoryModuleConfig } from './module';

const indexes: TypedIndexDescription<MigrationState>[] = [
  { key: { name: 1 }, unique: true }
];

@singleton({ defaultArgumentProvider: () => mongoMigrationStateRepositoryModuleConfig.defaultMigrationStateRepositoryConfig })
export class MongoMigrationStateRepository extends MongoEntityRepository<MigrationState> implements MigrationStateRepository, Injectable<CollectionArgument<MigrationState>> {
  readonly [resolveArgumentType]: CollectionArgument<MigrationState, MigrationState>;

  constructor(@forwardArg() collection: Collection<MigrationState>, @resolveArg<LoggerArgument>(MongoMigrationStateRepository.name) logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}
