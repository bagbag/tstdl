import type { Injectable } from '#/container';
import { forwardArg, resolveArgumentType, singleton } from '#/container';
import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo';
import { Logger } from '#/logger';
import type { MailLog } from '../models';

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
  [resolveArgumentType]: MongoMailLogRepositoryArgument;

  constructor(@forwardArg() collection: Collection<MailLog>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}

export function configureMongoMailLogRepository(config: Partial<MongoMailLogRepositoryConfig> = {}): void {
  mongoMailLogRepositoryConfig.config = config.config ?? mongoMailLogRepositoryConfig.config;
}
