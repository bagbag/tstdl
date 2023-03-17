import type { Injectable } from '#/container/index.js';
import { forwardArg, type resolveArgumentType, singleton } from '#/container/index.js';
import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo/index.js';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo/index.js';
import { Logger } from '#/logger/index.js';
import type { Binary } from 'mongodb';
import type { AuthenticationSession, NewAuthenticationSession } from '../../models/index.js';
import type { AuthenticationSessionExtendData } from '../authentication-session.repository.js';
import { AuthenticationSessionRepository } from '../authentication-session.repository.js';

export type MongoAuthenticationSessionRepositoryConfig = MongoAuthenticationSessionRepositoryArgument;

export type MongoAuthenticationSessionRepositoryArgument = CollectionArgument<AuthenticationSession>;

let defaultArgument: MongoAuthenticationSessionRepositoryArgument | undefined;

const indexes: TypedIndexDescription<AuthenticationSession>[] = [];

@singleton({
  defaultArgumentProvider: () => defaultArgument
})
export class InternalMongoAuthenticationSessionRepository extends MongoEntityRepository<AuthenticationSession> implements Injectable<MongoAuthenticationSessionRepositoryArgument> {
  declare readonly [resolveArgumentType]: MongoAuthenticationSessionRepositoryArgument;

  constructor(@forwardArg() collection: Collection<AuthenticationSession>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }
}

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
    const session = await this.repository.load(id);

    return {
      ...session,
      refreshTokenSalt: (session.refreshTokenSalt as unknown as Binary).buffer,
      refreshTokenHash: (session.refreshTokenHash as unknown as Binary).buffer
    };
  }

  async extend(id: string, data: AuthenticationSessionExtendData): Promise<void> {
    await this.repository.patchByFilter({ id }, data);
  }

  async end(id: string, timestamp: number): Promise<void> {
    await this.repository.patchByFilter({ id }, { end: timestamp });
  }
}

export function configureMongoAuthenticationSessionRepository(config: MongoAuthenticationSessionRepositoryConfig): void {
  defaultArgument = config;
}
