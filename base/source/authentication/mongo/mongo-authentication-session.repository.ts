import type { Injectable } from '#/container';
import { forwardArg, resolveArgumentType, singleton } from '#/container';
import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo';
import { Logger } from '#/logger';
import type { AuthenticationSessionExtendData } from '../authentication-session.repository';
import { AuthenticationSessionRepository } from '../authentication-session.repository';
import type { AuthenticationSession, NewAuthenticationSession } from '../models';

export type MongoAuthenticationSessionRepositoryConfig = {
  config?: MongoAuthenticationSessionRepositoryArgument
};

export type MongoAuthenticationSessionRepositoryArgument = CollectionArgument<AuthenticationSession>;

export const mongoAuthenticationSessionRepositoryConfig: MongoAuthenticationSessionRepositoryConfig = {};

const indexes: TypedIndexDescription<AuthenticationSession>[] = [];


@singleton()
export class MongoAuthenticationSessionRepository extends AuthenticationSessionRepository {
  private readonly repository: InternalMongoAuthenticationSessionRepository;

  constructor(repository: InternalMongoAuthenticationSessionRepository) {
    super();
    this.repository = repository;
  }

  async insert(authenticationSession: NewAuthenticationSession): Promise<AuthenticationSession> {
    return this.repository.insert(authenticationSession);
  }

  async load(id: string): Promise<AuthenticationSession> {
    return this.repository.load(id);
  }

  async extend(id: string, data: AuthenticationSessionExtendData): Promise<void> {
    await this.repository.patchByFilter({ id }, data);
  }

  async end(id: string, timestamp: number): Promise<void> {
    await this.repository.patchByFilter({ id }, { end: timestamp });
  }
}

@singleton({
  defaultArgumentProvider: () => mongoAuthenticationSessionRepositoryConfig.config
})
export class InternalMongoAuthenticationSessionRepository extends MongoEntityRepository<AuthenticationSession> implements Injectable<MongoAuthenticationSessionRepositoryArgument> {
  readonly [resolveArgumentType]: MongoAuthenticationSessionRepositoryArgument;

  constructor(@forwardArg() collection: Collection<AuthenticationSession>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}

export function configureMongoAuthenticationSessionRepository(config: Partial<MongoAuthenticationSessionRepositoryConfig> = {}): void {
  mongoAuthenticationSessionRepositoryConfig.config = config.config ?? mongoAuthenticationSessionRepositoryConfig.config;
}
