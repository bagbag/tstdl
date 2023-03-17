import type { Injectable } from '#/container/index.js';
import { forwardArg, singleton, type resolveArgumentType } from '#/container/index.js';
import type { MaybeNewEntity } from '#/database/index.js';
import { getNewId } from '#/database/index.js';
import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo/index.js';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo/index.js';
import { Logger } from '#/logger/index.js';
import { isUndefined } from '#/utils/type-guards.js';
import type { Binary } from 'mongodb';
import type { AuthenticationCredentials, NewAuthenticationCredentials } from '../../models/index.js';
import { AuthenticationCredentialsRepository } from '../authentication-credentials.repository.js';

export type MongoAuthenticationCredentialsRepositoryArgument = CollectionArgument<AuthenticationCredentials>;

export type MongoAuthenticationCredentialsRepositoryConfig = MongoAuthenticationCredentialsRepositoryArgument;

let defaultArgument: MongoAuthenticationCredentialsRepositoryConfig | undefined;

const indexes: TypedIndexDescription<AuthenticationCredentials>[] = [
  { key: { subject: 1 }, unique: true }
];

@singleton({
  defaultArgumentProvider: () => defaultArgument
})
export class InternalMongoAuthenticationCredentialsRepository extends MongoEntityRepository<AuthenticationCredentials> implements Injectable<MongoAuthenticationCredentialsRepositoryArgument> {
  declare readonly [resolveArgumentType]: MongoAuthenticationCredentialsRepositoryArgument;

  constructor(@forwardArg() collection: Collection<AuthenticationCredentials>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }

  async upsert(credentials: MaybeNewEntity<AuthenticationCredentials>): Promise<void> {
    const { id: _, ...credentialsWithoutId } = credentials;

    await this.baseRepository.update({ subject: credentials.subject }, { $setOnInsert: { _id: getNewId() }, $set: credentialsWithoutId }, { upsert: true });
  }
}

@singleton()
export class MongoAuthenticationCredentialsRepository extends AuthenticationCredentialsRepository {
  private readonly repository: InternalMongoAuthenticationCredentialsRepository;

  constructor(repository: InternalMongoAuthenticationCredentialsRepository) {
    super();
    this.repository = repository;
  }

  async tryLoadBySubject(subject: string): Promise<AuthenticationCredentials | undefined> {
    const credentials = await this.repository.tryLoadByFilter({ subject });

    if (isUndefined(credentials)) {
      return credentials;
    }

    return {
      ...credentials,
      salt: (credentials.salt as unknown as Binary).buffer,
      hash: (credentials.hash as unknown as Binary).buffer
    };
  }

  async save(credentials: AuthenticationCredentials | NewAuthenticationCredentials): Promise<void> {
    await this.repository.upsert(credentials);
  }
}

export function configureMongoAuthenticationCredentialsRepository(config: MongoAuthenticationCredentialsRepositoryConfig): void {
  defaultArgument = config;
}
