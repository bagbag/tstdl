import type { Injectable } from '#/container/index.js';
import { forwardArg, singleton, type resolveArgumentType } from '#/container/index.js';
import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo/index.js';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo/index.js';
import { Logger } from '#/logger/index.js';
import type { MailLog } from '../models/mail-log.model.js';

export type MongoMailLogRepositoryConfig = {
  config?: MongoMailLogRepositoryArgument
};

export type MongoMailLogRepositoryArgument = CollectionArgument<MailLog>;

export const mongoMailLogRepositoryConfig: MongoMailLogRepositoryConfig = {};

const indexes: TypedIndexDescription<MailLog>[] = [];

@singleton({
  defaultArgumentProvider: () => mongoMailLogRepositoryConfig.config
})
export class MongoMailLogRepository extends MongoEntityRepository<MailLog> implements Injectable<MongoMailLogRepositoryArgument> {
  declare readonly [resolveArgumentType]: MongoMailLogRepositoryArgument;
  constructor(@forwardArg() collection: Collection<MailLog>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}

export function configureMongoMailLogRepository(config: Partial<MongoMailLogRepositoryConfig> = {}): void {
  mongoMailLogRepositoryConfig.config = config.config ?? mongoMailLogRepositoryConfig.config;
}
