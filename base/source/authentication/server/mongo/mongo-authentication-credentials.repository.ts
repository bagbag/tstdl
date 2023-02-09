import type { Injectable } from '#/container';
import { forwardArg, resolveArgumentType, singleton } from '#/container';
import type { MaybeNewEntity } from '#/database';
import { getNewId } from '#/database';
import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo';
import { Logger } from '#/logger';
import { isUndefined } from '#/utils/type-guards';
import type { Binary } from 'mongodb';
import type { AuthenticationCredentials, NewAuthenticationCredentials } from '../../models';
import { AuthenticationCredentialsRepository } from '../authentication-credentials.repository';

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
  readonly [resolveArgumentType]: MongoAuthenticationCredentialsRepositoryArgument;

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
