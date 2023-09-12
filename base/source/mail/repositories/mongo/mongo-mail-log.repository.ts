import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo/index.js';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo/index.js';
import { ForwardArg, Singleton, resolveArgumentType } from '#/injector/index.js';
import type { Resolvable } from '#/injector/interfaces.js';
import { Logger } from '#/logger/index.js';
import type { MailLog } from '../../models/mail-log.model.js';

export type MongoMailLogRepositoryConfig = {
  config?: MongoMailLogRepositoryArgument
};

export type MongoMailLogRepositoryArgument = CollectionArgument<MailLog>;

export const mongoMailLogRepositoryConfig: MongoMailLogRepositoryConfig = {};

const indexes: TypedIndexDescription<MailLog>[] = [];

@Singleton({
  defaultArgumentProvider: () => mongoMailLogRepositoryConfig.config
})
export class MongoMailLogRepository extends MongoEntityRepository<MailLog> implements Resolvable<MongoMailLogRepositoryArgument> {
  declare readonly [resolveArgumentType]: MongoMailLogRepositoryArgument;
  constructor(@ForwardArg() collection: Collection<MailLog>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}

export function configureMongoMailLogRepository(config: Partial<MongoMailLogRepositoryConfig> = {}): void {
  mongoMailLogRepositoryConfig.config = config.config ?? mongoMailLogRepositoryConfig.config;
}
