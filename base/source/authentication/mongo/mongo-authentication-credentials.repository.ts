import type { Injectable } from '#/container';
import { forwardArg, resolveArgumentType, singleton } from '#/container';
import { getNewId, MaybeNewEntity } from '#/database';
import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo';
import { Logger } from '#/logger';
import { AuthenticationCredentialsRepository } from '../authentication-credentials.repository';
import type { AuthenticationCredentials, NewAuthenticationCredentials } from '../models';

export type MongoAuthenticationCredentialsRepositoryConfig = {
  config?: MongoAuthenticationCredentialsRepositoryArgument
};

export type MongoAuthenticationCredentialsRepositoryArgument = CollectionArgument<AuthenticationCredentials>;

export const mongoAuthenticationCredentialsRepositoryConfig: MongoAuthenticationCredentialsRepositoryConfig = {};

const indexes: TypedIndexDescription<AuthenticationCredentials>[] = [
  { key: { subject: 1 }, unique: true }
];

@singleton()
export class MongoAuthenticationCredentialsRepository extends AuthenticationCredentialsRepository {
  private readonly repository: InternalMongoAuthenticationCredentialsRepository;

  constructor(repository: InternalMongoAuthenticationCredentialsRepository) {
    super();
    this.repository = repository;
  }

  async tryLoad(id: string): Promise<AuthenticationCredentials | undefined> {
    return this.repository.tryLoad(id);
  }

  async save(credentials: AuthenticationCredentials | NewAuthenticationCredentials): Promise<void> {
    await this.repository.upsert(credentials);
  }
}

@singleton({
  defaultArgumentProvider: () => mongoAuthenticationCredentialsRepositoryConfig.config
})
export class InternalMongoAuthenticationCredentialsRepository extends MongoEntityRepository<AuthenticationCredentials> implements Injectable<MongoAuthenticationCredentialsRepositoryArgument> {
  readonly [resolveArgumentType]: MongoAuthenticationCredentialsRepositoryArgument;

  constructor(@forwardArg() collection: Collection<AuthenticationCredentials>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }

  async upsert(credentials: MaybeNewEntity<AuthenticationCredentials>): Promise<void> {
    const { id: _, ...credentialsWithoutId } = credentials;

    await this.baseRepository.update({ subject: credentials.subject }, { $setOnInsert: { _id: getNewId() }, $set: credentialsWithoutId }, { upsert: true });
  }
}

export function configureMongoAuthenticationCredentialsRepository(config: Partial<MongoAuthenticationCredentialsRepositoryConfig> = {}): void {
  mongoAuthenticationCredentialsRepositoryConfig.config = config.config ?? mongoAuthenticationCredentialsRepositoryConfig.config;
}
